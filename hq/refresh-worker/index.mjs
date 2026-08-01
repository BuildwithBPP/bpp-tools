import { createAdapter, sourceRecord, sourceRecords } from "./adapters.mjs";
import { verifyOwner } from "./auth.mjs";
import { runRefresh, sourcesForCron } from "./core.mjs";
import { summarizeHubSpotSnapshot } from "./hubspot-bi.mjs";
import { summarizeMondaySnapshot } from "./monday-bi.mjs";
import { summarizeQuickBooksSnapshot } from "./quickbooks-bi.mjs";
import { D1R2Store } from "./storage.mjs";

export function isAllowedOrigin(origin, configuredOrigins) {
  if (!origin || !configuredOrigins) return false;
  const allowed = String(configuredOrigins)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

function configuredOrigins(env) {
  return env?.ALLOWED_ORIGINS ?? env?.ALLOWED_ORIGIN;
}

export function createRuntimeIdFactory(cryptoApi = crypto) {
  return () => cryptoApi.randomUUID();
}

function json(data, status = 200, request, env) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  const origin = request?.headers.get("Origin");
  if (isAllowedOrigin(origin, configuredOrigins(env))) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function assertOrigin(request, env) {
  if (!isAllowedOrigin(request.headers.get("Origin"), configuredOrigins(env))) {
    throw new Error("Request origin is not approved.");
  }
}

export async function buildSourceStatus(record, env, latest, credentialStore) {
  let availableCredentialStore = credentialStore;
  if (record.id === "quickbooks" && !env.QUICKBOOKS_REFRESH_TOKEN && credentialStore?.readCredential) {
    const storedRefreshToken = await credentialStore.readCredential("quickbooks", "refresh_token");
    if (!storedRefreshToken) availableCredentialStore = null;
  }
  const adapter = createAdapter(record, env, { credentialStore: availableCredentialStore });
  return {
    ...record,
    configured: adapter.configured,
    configuration_reason: adapter.configured ? null : adapter.reason,
    latest: latest ?? null
  };
}

async function handleApi(request, env) {
  const actor = await verifyOwner(request, env);
  const url = new URL(request.url);
  const store = new D1R2Store(env);

  if (request.method === "GET" && url.pathname === "/api/refresh/status") {
    const stored = await store.listStatus();
    return json({
      sources: await Promise.all(sourceRecords().map((record) => buildSourceStatus(
        record,
        env,
        stored.find((status) => status.source === record.id),
        store
      )))
    }, 200, request, env);
  }

  if (request.method === "GET" && url.pathname === "/api/bi/hubspot") {
    const latest = await store.latest("hubspot");
    if (!latest) return json({ error: "No successful HubSpot snapshot exists." }, 404, request, env);
    return json({
      snapshot_id: latest.metadata.id,
      ...summarizeHubSpotSnapshot(latest.data)
    }, 200, request, env);
  }

  if (request.method === "GET" && url.pathname === "/api/bi/monday") {
    const latest = await store.latest("monday");
    if (!latest) return json({ error: "No successful Monday snapshot exists." }, 404, request, env);
    return json({
      snapshot_id: latest.metadata.id,
      ...summarizeMondaySnapshot(latest.data)
    }, 200, request, env);
  }

  if (request.method === "GET" && url.pathname === "/api/bi/quickbooks") {
    const latest = await store.latest("quickbooks");
    if (!latest) return json({ error: "No successful QuickBooks snapshot exists." }, 404, request, env);
    return json({
      snapshot_id: latest.metadata.id,
      ...summarizeQuickBooksSnapshot(latest.data)
    }, 200, request, env);
  }

  const refreshMatch = url.pathname.match(/^\/api\/refresh\/([a-z0-9-]+)$/);
  if (request.method === "POST" && refreshMatch) {
    assertOrigin(request, env);
    const source = refreshMatch[1];
    const record = sourceRecord(source);
    if (!record) return json({ error: "Unknown refresh source." }, 404, request, env);
    if (await store.recentlyStarted(source)) return json({ error: "A refresh is already running." }, 429, request, env);
    const result = await runRefresh({
      source,
      trigger: "manual",
      actor,
      now: new Date(),
      idFactory: createRuntimeIdFactory(),
      adapter: createAdapter(record, env, { credentialStore: store }),
      store
    });
    return json(result, result.status === "disabled" ? 409 : 202, request, env);
  }

  const latestMatch = url.pathname.match(/^\/api\/data\/([a-z0-9-]+)\/latest$/);
  if (request.method === "GET" && latestMatch) {
    const result = await store.latest(latestMatch[1]);
    return result ? json(result, 200, request, env) : json({ error: "No successful snapshot exists." }, 404, request, env);
  }

  const historyMatch = url.pathname.match(/^\/api\/data\/([a-z0-9-]+)\/history$/);
  if (request.method === "GET" && historyMatch) {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    return json({ snapshots: await store.history(historyMatch[1], limit) }, 200, request, env);
  }

  return json({ error: "Not found." }, 404, request, env);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({}, 204, request, env);
    try {
      return await handleApi(request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected refresh error.";
      const status = /Access|authenticated|approved|origin/i.test(message) ? 403 : 500;
      return json({ error: message }, status, request, env);
    }
  },

  async scheduled(controller, env, ctx) {
    const store = new D1R2Store(env);
    for (const record of sourcesForCron(controller.cron, sourceRecords())) {
      const adapter = createAdapter(record, env, { credentialStore: store });
      if (!adapter.configured) continue;
      ctx.waitUntil(runRefresh({
        source: record.id,
        trigger: "schedule",
        actor: "system:schedule",
        now: new Date(controller.scheduledTime),
        idFactory: createRuntimeIdFactory(),
        adapter,
        store
      }));
    }
  }
};
