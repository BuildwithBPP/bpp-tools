import assert from "node:assert/strict";
import test from "node:test";

import { createAdapter, sourceRecord } from "../refresh-worker/adapters.mjs";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("HubSpot adapter paginates read-only deals and includes pipeline definitions", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("/crm/v3/pipelines/deals")) {
      return jsonResponse({ results: [{ id: "default", label: "Sales Pipeline", stages: [] }] });
    }
    if (String(url).includes("after=page-2")) {
      return jsonResponse({ results: [{ id: "deal-2", properties: { dealname: "Second" } }] });
    }
    return jsonResponse({
      results: [{ id: "deal-1", properties: { dealname: "First" } }],
      paging: { next: { after: "page-2" } }
    });
  };

  const adapter = createAdapter(
    sourceRecord("hubspot"),
    { HUBSPOT_ACCESS_TOKEN: "hubspot-secret" },
    { fetchImpl }
  );
  assert.equal(adapter.configured, true);

  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });
  assert.equal(payload.source, "hubspot");
  assert.equal(payload.captured_at, "2026-07-31T12:00:00.000Z");
  assert.deepEqual(payload.records.map((record) => record.kind), ["pipeline", "deal", "deal"]);
  assert.equal(requests.length, 3);
  assert.ok(requests.every((request) => request.options.method === undefined || request.options.method === "GET"));
  assert.ok(requests.every((request) => request.options.headers.Authorization === "Bearer hubspot-secret"));
});

test("Monday adapter requests the governed boards and preserves subitems", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    return jsonResponse({
      data: {
        boards: [{
          id: "18406003425",
          name: "BPP Operations",
          groups: [{ id: "g1", title: "Sprint" }],
          items_page: {
            cursor: null,
            items: [{
              id: "i1",
              name: "Protect previews",
              group: { id: "g1", title: "Sprint" },
              column_values: [],
              subitems: [{ id: "s1", name: "Verify hash URL", column_values: [] }]
            }]
          }
        }]
      }
    });
  };

  const adapter = createAdapter(
    sourceRecord("monday"),
    { MONDAY_ACCESS_TOKEN: "monday-secret", MONDAY_BOARD_IDS: "18406003425,18406004595" },
    { fetchImpl }
  );
  assert.equal(adapter.configured, true);

  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });
  assert.equal(payload.source, "monday");
  assert.equal(payload.records[0].kind, "board");
  assert.equal(payload.records[0].items[0].subitems[0].id, "s1");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[0].options.headers.Authorization, "monday-secret");
  assert.deepEqual(JSON.parse(requests[0].options.body).variables.boardIds, [18406003425, 18406004595]);
  assert.ok(JSON.parse(requests[0].options.body).query.includes("items_page"));
  assert.ok(!JSON.parse(requests[0].options.body).query.includes("mutation"));
});

test("Monday adapter follows items_page cursors so work is not silently omitted", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), options });
    if (requests.length === 1) {
      return jsonResponse({
        data: {
          boards: [{
            id: "18406003425",
            name: "BPP Operations",
            groups: [],
            items_page: { cursor: "next-cursor", items: [{ id: "i1", name: "First", subitems: [] }] }
          }]
        }
      });
    }
    return jsonResponse({
      data: {
        next_items_page: { cursor: null, items: [{ id: "i2", name: "Second", subitems: [] }] }
      }
    });
  };

  const adapter = createAdapter(
    sourceRecord("monday"),
    { MONDAY_ACCESS_TOKEN: "monday-secret", MONDAY_BOARD_IDS: "18406003425" },
    { fetchImpl }
  );
  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });

  assert.deepEqual(payload.records[0].items.map((item) => item.id), ["i1", "i2"]);
  assert.equal(requests.length, 2);
  assert.equal(JSON.parse(requests[1].options.body).variables.cursor, "next-cursor");
  assert.ok(JSON.parse(requests[1].options.body).query.includes("next_items_page"));
});

test("QuickBooks adapter refreshes OAuth and pulls the four governing reports", async () => {
  const requests = [];
  const credentialWrites = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("oauth.platform.intuit.com")) {
      return jsonResponse({ access_token: "access-token", refresh_token: "rotated-refresh", expires_in: 3600 });
    }
    const reportName = new URL(String(url)).pathname.split("/").at(-1);
    return jsonResponse({ Header: { ReportName: reportName }, Rows: { Row: [] } });
  };

  const adapter = createAdapter(
    sourceRecord("quickbooks"),
    {
      QUICKBOOKS_CLIENT_ID: "client-id",
      QUICKBOOKS_CLIENT_SECRET: "client-secret",
      QUICKBOOKS_REALM_ID: "realm-123",
      QUICKBOOKS_REFRESH_TOKEN: "refresh-token"
    },
    {
      fetchImpl,
      credentialStore: {
        async readCredential() { return null; },
        async writeCredential(source, name, value) { credentialWrites.push({ source, name, value }); }
      }
    }
  );
  assert.equal(adapter.configured, true);

  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });
  assert.equal(payload.source, "quickbooks");
  assert.deepEqual(payload.records.map((record) => record.id), [
    "profit-and-loss",
    "balance-sheet",
    "cash-flow",
    "aged-receivables"
  ]);
  assert.equal(requests.filter((request) => request.url.includes("/reports/")).length, 4);
  assert.ok(requests.filter((request) => request.url.includes("/reports/")).every(
    (request) => request.options.headers.Authorization === "Bearer access-token"
  ));
  assert.deepEqual(credentialWrites, [
    { source: "quickbooks", name: "refresh_token", value: "rotated-refresh" }
  ]);
  assert.ok(!JSON.stringify(payload).includes("rotated-refresh"));
});

test("GitHub adapter returns the organization repository inventory using read-only requests", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return jsonResponse([{ id: 1, name: "bpp-tools", full_name: "BuildwithBPP/bpp-tools", private: false }]);
  };

  const adapter = createAdapter(
    sourceRecord("github"),
    { GITHUB_TOKEN: "github-secret", GITHUB_ORG: "BuildwithBPP" },
    { fetchImpl }
  );
  assert.equal(adapter.configured, true);

  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });
  assert.equal(payload.source, "github");
  assert.deepEqual(payload.records[0], {
    kind: "repository",
    id: "1",
    name: "bpp-tools",
    full_name: "BuildwithBPP/bpp-tools",
    private: false
  });
  assert.equal(requests[0].options.headers.Authorization, "Bearer github-secret");
  assert.equal(requests[0].options.method, undefined);
});

test("GitHub adapter follows repository pagination", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (requests.length === 1) {
      return new Response(JSON.stringify([{ id: 1, name: "one", full_name: "BuildwithBPP/one", private: true }]), {
        headers: {
          "Content-Type": "application/json",
          Link: '<https://api.github.com/organizations/1/repos?per_page=100&page=2>; rel="next"'
        }
      });
    }
    return jsonResponse([{ id: 2, name: "two", full_name: "BuildwithBPP/two", private: false }]);
  };

  const adapter = createAdapter(
    sourceRecord("github"),
    { GITHUB_TOKEN: "github-secret", GITHUB_ORG: "BuildwithBPP" },
    { fetchImpl }
  );
  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });

  assert.deepEqual(payload.records.map((record) => record.name), ["one", "two"]);
  assert.equal(requests.length, 2);
});

test("GitHub and Workspace can use short-lived GitHub App installation tokens", async () => {
  const tokenRequests = [];
  const githubAppTokenFactory = async (configuration) => {
    tokenRequests.push(configuration);
    return "installation-token";
  };
  const fetchImpl = async (url) => {
    if (String(url).includes("/installation/repositories")) {
      return jsonResponse({
        repositories: [{ id: 3, name: "bpp-workspace", full_name: "BuildwithBPP/bpp-workspace", private: true }]
      });
    }
    return jsonResponse({
      path: "_claude/data/current-week.md",
      sha: "sha-1",
      encoding: "base64",
      content: Buffer.from("# Current Week").toString("base64")
    });
  };
  const env = {
    GITHUB_APP_ID: "app-1",
    GITHUB_APP_INSTALLATION_ID: "installation-1",
    GITHUB_APP_PRIVATE_KEY: "private-key",
    GITHUB_ORG: "BuildwithBPP",
    WORKSPACE_REPOSITORY: "BuildwithBPP/bpp-workspace"
  };

  const github = createAdapter(sourceRecord("github"), env, { fetchImpl, githubAppTokenFactory });
  const workspace = createAdapter(sourceRecord("workspace"), env, { fetchImpl, githubAppTokenFactory });
  const githubPayload = await github.pull({ now: new Date("2026-07-31T12:00:00Z") });
  const workspacePayload = await workspace.pull({ now: new Date("2026-07-31T12:00:00Z") });

  assert.equal(githubPayload.records[0].name, "bpp-workspace");
  assert.equal(workspacePayload.records[0].content, "# Current Week");
  assert.equal(tokenRequests.length, 2);
  assert.ok(tokenRequests.every((request) => request.appId === "app-1"));
});

test("Workspace adapter reads the current-week brief from the private GitHub repository", async () => {
  const requests = [];
  const markdown = "# Current Week\n\n## North Star\nClose the loop.";
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return jsonResponse({
      name: "current-week.md",
      path: "_claude/data/current-week.md",
      sha: "abc123",
      encoding: "base64",
      content: Buffer.from(markdown).toString("base64")
    });
  };

  const adapter = createAdapter(
    sourceRecord("workspace"),
    {
      GITHUB_TOKEN: "github-secret",
      WORKSPACE_REPOSITORY: "BuildwithBPP/bpp-workspace",
      WORKSPACE_REF: "main"
    },
    { fetchImpl }
  );
  assert.equal(adapter.configured, true);

  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });
  assert.equal(payload.source, "workspace");
  assert.equal(payload.records[0].kind, "current-week");
  assert.equal(payload.records[0].content, markdown);
  assert.ok(requests[0].url.includes("repos/BuildwithBPP/bpp-workspace/contents/_claude%2Fdata%2Fcurrent-week.md"));
});

test("Metricool adapter accepts a governed gateway but normalizes vendor data into an envelope", async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return jsonResponse({ brand_id: "bpp", totals: { impressions: 1250 }, posts: [{ id: "p1" }] });
  };

  const adapter = createAdapter(
    sourceRecord("metricool"),
    { METRICOOL_SNAPSHOT_URL: "https://metricool-gateway.example/snapshot", METRICOOL_SNAPSHOT_TOKEN: "metricool-secret" },
    { fetchImpl }
  );
  assert.equal(adapter.configured, true);

  const payload = await adapter.pull({ now: new Date("2026-07-31T12:00:00Z") });
  assert.equal(payload.source, "metricool");
  assert.equal(payload.records[0].kind, "metricool-snapshot");
  assert.equal(payload.records[0].data.totals.impressions, 1250);
  assert.equal(requests[0].options.headers.Authorization, "Bearer metricool-secret");
});

test("adapters report missing configuration without leaking supplied secret values", () => {
  const adapter = createAdapter(
    sourceRecord("quickbooks"),
    { QUICKBOOKS_CLIENT_ID: "sensitive-client-id" }
  );
  assert.equal(adapter.configured, false);
  assert.ok(adapter.reason.includes("QUICKBOOKS_CLIENT_SECRET"));
  assert.ok(!adapter.reason.includes("sensitive-client-id"));
});
