import { createAdapter, sourceRecord, sourceRecords } from "./adapters.mjs";
import { verifyOwner } from "./auth.mjs";
import { runRefresh, sourcesForCron } from "./core.mjs";
import { D1R2Store } from "./storage.mjs";

function json(data, status = 200, request, env) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  const origin = request?.headers.get("Origin");
  if (origin && env?.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function assertOrigin(request, env) {
  if (!env.ALLOWED_ORIGIN) return;
  if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) throw new Error("Request origin is not approved.");
}

async function handleApi(request, env) {
  const actor = await verifyOwner(request, env);
  const url = new URL(request.url);
  const store = new D1R2Store(env);

  if (request.method === "GET" && url.pathname === "/api/refresh/status") {
    const stored = await store.listStatus();
    return json({
      sources: sourceRecords().map((record) => ({
        ...record,
        configured: createAdapter(record, env, { credentialStore: store }).configured,
        latest: stored.find((status) => status.source === record.id) ?? null
      }))
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
      idFactory: crypto.randomUUID,
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
        idFactory: crypto.randomUUID,
        adapter,
        store
      }));
    }
  }
};
