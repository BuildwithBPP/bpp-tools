import assert from "node:assert/strict";
import test from "node:test";
import { startDeliveryDevApi } from "./delivery-dev-api.mjs";

const boardId = "18406004595";
const subitemBoardId = "18406004597";

function mondayResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function fakeMonday({ mismatch = false, upstreamFailure = false } = {}) {
  let dueDate = "2026-08-27";
  let archived = false;
  let created = null;
  const fetcher = async (_url, options) => {
    if (upstreamFailure) return new Response("upstream exploded with diagnostic evidence", { status: 503 });
    const { query, variables = {} } = JSON.parse(options.body);
    if (query.includes("DeliveryMetadata")) return mondayResponse({ data: {
      boards: [{ id: subitemBoardId, columns: [{ id: "date0", title: "Due Date", type: "date" }, { id: "person", title: "Owner", type: "people" }, { id: "status", title: "Status", type: "status" }] }],
      users: [{ id: "441", name: "Eli Fisher" }]
    } });
    if (query.includes("DeliveryItem")) {
      const id = String(variables.ids[0]);
      if (archived && id === "200") return mondayResponse({ data: { items: [] } });
      if (created && id === created.id) return mondayResponse({ data: { items: [created] } });
      return mondayResponse({ data: { items: [{ id, name: "Prepare copy", updated_at: "2026-08-26T00:00:00Z", board: { id: subitemBoardId }, column_values: [{ id: "date0", text: mismatch ? "2026-08-29" : dueDate, value: JSON.stringify({ date: mismatch ? "2026-08-29" : dueDate }) }] }] } });
    }
    if (query.includes("ParentItem")) return mondayResponse({ data: { items: [{ id: String(variables.ids[0]), board: { id: boardId }, group: { id: "group_mm5vja6y" } }] } });
    if (query.includes("change_simple_column_value")) { dueDate = variables.value; return mondayResponse({ data: { change_simple_column_value: { id: String(variables.itemId) } } }); }
    if (query.includes("create_subitem")) {
      created = { id: "301", name: variables.name, updated_at: "2026-08-26T01:00:00Z", board: { id: subitemBoardId }, column_values: [{ id: "date0", text: JSON.parse(variables.columns).date0.date, value: JSON.stringify(JSON.parse(variables.columns).date0) }] };
      return mondayResponse({ data: { create_subitem: { id: "301" } } });
    }
    if (query.includes("archive_item")) { archived = true; return mondayResponse({ data: { archive_item: { id: String(variables.itemId) } } }); }
    throw new Error(`Unexpected query: ${query}`);
  };
  return fetcher;
}

async function withServer(fetcher, run) {
  const server = startDeliveryDevApi({ token: "test-token", port: 0, fetcher });
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    assert.equal(address.address, "127.0.0.1");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("refuses to start without a token", () => {
  assert.throws(() => startDeliveryDevApi({ token: "" }), /MONDAY_API_TOKEN is required/);
});

test("rejects a non-local browser origin and unexpected board", async () => {
  await withServer(fakeMonday(), async (url) => {
    const forbidden = await fetch(`${url}/health`, { headers: { origin: "https://evil.test" } });
    assert.equal(forbidden.status, 403);
    const wrongLocalApp = await fetch(`${url}/health`, { headers: { origin: "http://127.0.0.1:9999" } });
    assert.equal(wrongLocalApp.status, 403);
    const wrongBoard = await fetch(`${url}/tasks/200/due-date`, { method: "PATCH", headers: { "content-type": "application/json", origin: "http://127.0.0.1:4321" }, body: JSON.stringify({ boardId: "1", dueDate: "2026-08-28", expectedUpdatedAt: "2026-08-26T00:00:00Z" }) });
    assert.equal(wrongBoard.status, 400);
  });
});

test("updates a subitem and confirms only after matching read-back", async () => {
  await withServer(fakeMonday(), async (url) => {
    const response = await fetch(`${url}/tasks/200/due-date`, { method: "PATCH", headers: { "content-type": "application/json", origin: "http://127.0.0.1:4321" }, body: JSON.stringify({ boardId, dueDate: "2026-08-28", expectedUpdatedAt: "2026-08-26T00:00:00Z" }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.syncState, "confirmed");
    assert.equal(body.record.currentDue, "2026-08-28");
  });
});

test("rejects stale versions and reports a read-back conflict", async () => {
  await withServer(fakeMonday(), async (url) => {
    const stale = await fetch(`${url}/tasks/200/due-date`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ boardId, dueDate: "2026-08-28", expectedUpdatedAt: "2026-08-25T00:00:00Z" }) });
    assert.equal(stale.status, 409);
  });
  await withServer(fakeMonday({ mismatch: true }), async (url) => {
    const response = await fetch(`${url}/tasks/200/due-date`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ boardId, dueDate: "2026-08-28", expectedUpdatedAt: "2026-08-26T00:00:00Z" }) });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).syncState, "conflict");
  });
});

test("creates under a verified parent with Eli defaults and archives without delete", async () => {
  await withServer(fakeMonday(), async (url) => {
    const create = await fetch(`${url}/deliverables/100/tasks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ boardId, projectId: "legacy-b-studio", name: "QA delivery sync", dueDate: "2026-08-28", ownerName: "Eli Fisher", status: "Not Started" }) });
    assert.equal(create.status, 201);
    const created = await create.json();
    assert.equal(created.syncState, "confirmed");
    assert.match(created.mondayUrl, /301/);
    const archive = await fetch(`${url}/tasks/200/archive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ boardId, expectedUpdatedAt: "2026-08-26T00:00:00Z" }) });
    assert.equal(archive.status, 200);
    assert.equal((await archive.json()).syncState, "confirmed");
  });
});

test("upstream failures include status and bounded raw evidence", async () => {
  await withServer(fakeMonday({ upstreamFailure: true }), async (url) => {
    const response = await fetch(`${url}/owners`);
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.match(body.message, /503/);
    assert.match(body.message, /upstream exploded/);
    assert.ok(body.message.length < 600);
  });
});
