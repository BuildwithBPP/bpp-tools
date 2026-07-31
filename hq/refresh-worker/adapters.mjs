import registry from "../src/data/refresh-sources.json" with { type: "json" };
import { importPKCS8, SignJWT } from "jose";

const DEFAULT_TIMEOUT_MS = 25_000;
const HUBSPOT_DEAL_PROPERTIES = [
  "dealname",
  "amount",
  "dealstage",
  "pipeline",
  "closedate",
  "createdate",
  "hs_is_closed_won",
  "hubspot_owner_id",
  "dealtype",
  "hs_closed_amount"
];

export function sourceRecord(source) {
  return registry.sources.find((record) => record.id === source) ?? null;
}

export function sourceRecords() {
  return registry.sources;
}

function missingConfiguration(record, fields) {
  return {
    configured: false,
    reason: `${record.label} is missing required configuration: ${fields.join(", ")}.`
  };
}

function configuredAdapter(pull) {
  return { configured: true, pull };
}

function timeoutSignal() {
  return AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
}

async function responseJson(response, label) {
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}.`);
  }
  return response.json();
}

function envelope(source, now, records) {
  return {
    schema_version: 1,
    source,
    captured_at: now.toISOString(),
    records
  };
}

function bearerHeaders(token, extra = {}) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...extra
  };
}

function createHubSpotAdapter(record, env, fetchImpl) {
  if (!env.HUBSPOT_ACCESS_TOKEN) return missingConfiguration(record, ["HUBSPOT_ACCESS_TOKEN"]);

  return configuredAdapter(async ({ now }) => {
    const headers = bearerHeaders(env.HUBSPOT_ACCESS_TOKEN);
    const pipelineResponse = await fetchImpl("https://api.hubapi.com/crm/v3/pipelines/deals", {
      headers,
      signal: timeoutSignal()
    });
    const pipelines = await responseJson(pipelineResponse, "HubSpot pipelines");
    const deals = [];
    let after = null;

    for (let page = 0; page < 100; page += 1) {
      const url = new URL("https://api.hubapi.com/crm/v3/objects/deals");
      url.searchParams.set("limit", "100");
      url.searchParams.set("archived", "false");
      url.searchParams.set("properties", HUBSPOT_DEAL_PROPERTIES.join(","));
      if (after) url.searchParams.set("after", after);
      const response = await fetchImpl(url, { headers, signal: timeoutSignal() });
      const body = await responseJson(response, "HubSpot deals");
      deals.push(...(body.results ?? []));
      after = body.paging?.next?.after ?? null;
      if (!after) break;
    }

    return envelope("hubspot", now, [
      ...(pipelines.results ?? []).map((pipeline) => ({ kind: "pipeline", ...pipeline })),
      ...deals.map((deal) => ({ kind: "deal", ...deal }))
    ]);
  });
}

const MONDAY_BOARD_QUERY = `
  query BppHqBoards($boardIds: [ID!]!) {
    boards(ids: $boardIds) {
      id
      name
      state
      groups { id title }
      items_page(limit: 500) {
        cursor
        items {
          id
          name
          updated_at
          group { id title }
          column_values { id type text value }
          subitems {
            id
            name
            updated_at
            column_values { id type text value }
          }
        }
      }
    }
  }
`;

const MONDAY_NEXT_PAGE_QUERY = `
  query BppHqNextItems($cursor: String!) {
    next_items_page(cursor: $cursor, limit: 500) {
      cursor
      items {
        id
        name
        updated_at
        group { id title }
        column_values { id type text value }
        subitems {
          id
          name
          updated_at
          column_values { id type text value }
        }
      }
    }
  }
`;

function createMondayAdapter(record, env, fetchImpl) {
  const missing = [];
  if (!env.MONDAY_ACCESS_TOKEN) missing.push("MONDAY_ACCESS_TOKEN");
  if (!env.MONDAY_BOARD_IDS) missing.push("MONDAY_BOARD_IDS");
  if (missing.length) return missingConfiguration(record, missing);

  const boardIds = String(env.MONDAY_BOARD_IDS)
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Number.isSafeInteger);
  if (!boardIds.length) return missingConfiguration(record, ["MONDAY_BOARD_IDS"]);

  return configuredAdapter(async ({ now }) => {
    const request = async (query, variables) => {
      const response = await fetchImpl("https://api.monday.com/v2", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: env.MONDAY_ACCESS_TOKEN,
          "Content-Type": "application/json",
          "API-Version": "2026-04"
        },
        body: JSON.stringify({ query, variables }),
        signal: timeoutSignal()
      });
      const body = await responseJson(response, "Monday.com boards");
      if (body.errors?.length) throw new Error(`Monday.com returned ${body.errors.length} GraphQL error(s).`);
      return body;
    };
    const body = await request(MONDAY_BOARD_QUERY, { boardIds });

    const records = [];
    for (const board of body.data?.boards ?? []) {
      const items = [...(board.items_page?.items ?? [])];
      let cursor = board.items_page?.cursor ?? null;
      for (let page = 0; cursor && page < 100; page += 1) {
        const nextBody = await request(MONDAY_NEXT_PAGE_QUERY, { cursor });
        const nextPage = nextBody.data?.next_items_page;
        items.push(...(nextPage?.items ?? []));
        cursor = nextPage?.cursor ?? null;
      }
      records.push({
        kind: "board",
        id: String(board.id),
        name: board.name,
        state: board.state ?? null,
        groups: board.groups ?? [],
        cursor,
        items
      });
    }
    return envelope("monday", now, records);
  });
}

function basicAuthorization(clientId, clientSecret) {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

function reportRange(now) {
  const end = now.toISOString().slice(0, 10);
  return { start: `${now.getUTCFullYear()}-01-01`, end };
}

function createQuickBooksAdapter(record, env, fetchImpl, credentialStore) {
  const missing = [];
  for (const name of ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET", "QUICKBOOKS_REALM_ID"]) {
    if (!env[name]) missing.push(name);
  }
  if (!env.QUICKBOOKS_REFRESH_TOKEN && !credentialStore) missing.push("QUICKBOOKS_REFRESH_TOKEN");
  if (missing.length) return missingConfiguration(record, missing);

  return configuredAdapter(async ({ now }) => {
    const storedRefreshToken = await credentialStore?.readCredential?.("quickbooks", "refresh_token");
    const refreshToken = storedRefreshToken ?? env.QUICKBOOKS_REFRESH_TOKEN;
    if (!refreshToken) throw new Error("QuickBooks refresh token is unavailable.");

    const tokenResponse = await fetchImpl("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: basicAuthorization(env.QUICKBOOKS_CLIENT_ID, env.QUICKBOOKS_CLIENT_SECRET),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
      signal: timeoutSignal()
    });
    const tokens = await responseJson(tokenResponse, "QuickBooks OAuth refresh");
    if (!tokens.access_token) throw new Error("QuickBooks OAuth response did not include an access token.");
    if (tokens.refresh_token && tokens.refresh_token !== refreshToken) {
      await credentialStore?.writeCredential?.("quickbooks", "refresh_token", tokens.refresh_token);
    }

    const range = reportRange(now);
    const reports = [
      ["profit-and-loss", "ProfitAndLoss", { start_date: range.start, end_date: range.end, accounting_method: "Cash" }],
      ["balance-sheet", "BalanceSheet", { as_of_date: range.end, accounting_method: "Cash" }],
      ["cash-flow", "CashFlow", { start_date: range.start, end_date: range.end, accounting_method: "Cash" }],
      ["aged-receivables", "AgedReceivables", { report_date: range.end }]
    ];
    const records = await Promise.all(reports.map(async ([id, reportName, parameters]) => {
      const url = new URL(`https://quickbooks.api.intuit.com/v3/company/${encodeURIComponent(env.QUICKBOOKS_REALM_ID)}/reports/${reportName}`);
      for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
      url.searchParams.set("minorversion", "75");
      const response = await fetchImpl(url, {
        headers: bearerHeaders(tokens.access_token),
        signal: timeoutSignal()
      });
      return {
        kind: "report",
        id,
        report_name: reportName,
        parameters,
        data: await responseJson(response, `QuickBooks ${reportName}`)
      };
    }));
    return envelope("quickbooks", now, records);
  });
}

function githubHeaders(token) {
  return bearerHeaders(token, {
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "bpp-hq-refresh"
  });
}

function hasGitHubAppConfiguration(env) {
  return Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_INSTALLATION_ID && env.GITHUB_APP_PRIVATE_KEY);
}

async function createGitHubAppInstallationToken({ appId, installationId, privateKey, fetchImpl }) {
  const normalizedKey = String(privateKey).replace(/\\n/g, "\n");
  const key = await importPKCS8(normalizedKey, "RS256");
  const issuedAt = Math.floor(Date.now() / 1000) - 60;
  const assertion = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt(issuedAt)
    .setIssuer(String(appId))
    .setExpirationTime(issuedAt + 540)
    .sign(key);
  const response = await fetchImpl(
    `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    {
      method: "POST",
      headers: githubHeaders(assertion),
      signal: timeoutSignal()
    }
  );
  const body = await responseJson(response, "GitHub App installation token");
  if (!body.token) throw new Error("GitHub App response did not include an installation token.");
  return body.token;
}

async function githubAccessToken(env, fetchImpl, githubAppTokenFactory) {
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  return githubAppTokenFactory({
    appId: env.GITHUB_APP_ID,
    installationId: env.GITHUB_APP_INSTALLATION_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    fetchImpl
  });
}

function createGitHubAdapter(record, env, fetchImpl, githubAppTokenFactory) {
  const missing = [];
  const appConfigured = hasGitHubAppConfiguration(env);
  if (!env.GITHUB_TOKEN && !appConfigured) {
    missing.push("GITHUB_TOKEN or GITHUB_APP_ID/GITHUB_APP_INSTALLATION_ID/GITHUB_APP_PRIVATE_KEY");
  }
  if (env.GITHUB_TOKEN && !env.GITHUB_ORG) missing.push("GITHUB_ORG");
  if (missing.length) return missingConfiguration(record, missing);

  return configuredAdapter(async ({ now }) => {
    const token = await githubAccessToken(env, fetchImpl, githubAppTokenFactory);
    let url = new URL(appConfigured
      ? "https://api.github.com/installation/repositories"
      : `https://api.github.com/orgs/${encodeURIComponent(env.GITHUB_ORG)}/repos`);
    url.searchParams.set("per_page", "100");
    if (!appConfigured) {
      url.searchParams.set("type", "all");
      url.searchParams.set("sort", "updated");
    }
    const repositories = [];
    for (let page = 0; url && page < 100; page += 1) {
      const response = await fetchImpl(url, { headers: githubHeaders(token), signal: timeoutSignal() });
      const body = await responseJson(response, "GitHub repositories");
      repositories.push(...(appConfigured ? body.repositories ?? [] : body));
      const next = response.headers.get("Link")
        ?.split(",")
        .map((value) => value.trim())
        .find((value) => value.endsWith('rel="next"'))
        ?.match(/^<([^>]+)>/)?.[1];
      url = next ? new URL(next) : null;
    }
    return envelope("github", now, repositories.map((repository) => ({
      kind: "repository",
      id: String(repository.id),
      name: repository.name,
      full_name: repository.full_name,
      private: Boolean(repository.private)
    })));
  });
}

function decodeBase64Utf8(value) {
  const binary = atob(String(value).replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function createWorkspaceAdapter(record, env, fetchImpl, githubAppTokenFactory) {
  const missing = [];
  if (!env.GITHUB_TOKEN && !hasGitHubAppConfiguration(env)) {
    missing.push("GITHUB_TOKEN or GITHUB_APP_ID/GITHUB_APP_INSTALLATION_ID/GITHUB_APP_PRIVATE_KEY");
  }
  if (!env.WORKSPACE_REPOSITORY) missing.push("WORKSPACE_REPOSITORY");
  if (missing.length) return missingConfiguration(record, missing);

  return configuredAdapter(async ({ now }) => {
    const token = await githubAccessToken(env, fetchImpl, githubAppTokenFactory);
    const path = "_claude/data/current-week.md";
    const url = new URL(`https://api.github.com/repos/${env.WORKSPACE_REPOSITORY}/contents/${encodeURIComponent(path)}`);
    url.searchParams.set("ref", env.WORKSPACE_REF || "main");
    const response = await fetchImpl(url, { headers: githubHeaders(token), signal: timeoutSignal() });
    const file = await responseJson(response, "BPP Workspace current-week brief");
    if (file.encoding !== "base64" || !file.content) throw new Error("BPP Workspace brief is not a base64 file response.");
    return envelope("workspace", now, [{
      kind: "current-week",
      id: file.sha,
      path: file.path,
      content: decodeBase64Utf8(file.content)
    }]);
  });
}

function createMetricoolAdapter(record, env, fetchImpl) {
  if (!env.METRICOOL_SNAPSHOT_URL) return missingConfiguration(record, ["METRICOOL_SNAPSHOT_URL"]);

  return configuredAdapter(async ({ now }) => {
    const headers = { Accept: "application/json" };
    if (env.METRICOOL_SNAPSHOT_TOKEN) headers.Authorization = `Bearer ${env.METRICOOL_SNAPSHOT_TOKEN}`;
    const response = await fetchImpl(env.METRICOOL_SNAPSHOT_URL, { headers, signal: timeoutSignal() });
    const data = await responseJson(response, "Metricool snapshot gateway");
    if (data?.schema_version && Array.isArray(data.records)) return data;
    return envelope("metricool", now, [{
      kind: "metricool-snapshot",
      id: String(data?.brand_id ?? "bpp"),
      data
    }]);
  });
}

export function createAdapter(record, env, dependencies = {}) {
  if (!record) return { configured: false, reason: "Unknown connector source." };
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const githubAppTokenFactory = dependencies.githubAppTokenFactory ?? createGitHubAppInstallationToken;
  switch (record.id) {
    case "hubspot": return createHubSpotAdapter(record, env, fetchImpl);
    case "monday": return createMondayAdapter(record, env, fetchImpl);
    case "quickbooks": return createQuickBooksAdapter(record, env, fetchImpl, dependencies.credentialStore);
    case "github": return createGitHubAdapter(record, env, fetchImpl, githubAppTokenFactory);
    case "workspace": return createWorkspaceAdapter(record, env, fetchImpl, githubAppTokenFactory);
    case "metricool": return createMetricoolAdapter(record, env, fetchImpl);
    default: return { configured: false, reason: `${record.label} connector is not implemented.` };
  }
}
