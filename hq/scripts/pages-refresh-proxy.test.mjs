import assert from "node:assert/strict";
import test from "node:test";
import { onRequest } from "../functions/api/[[path]].js";

function request(path, method = "GET") {
  return new Request(`https://bpp-hq-preview.pages.dev${path}`, { method });
}

test("Pages refresh proxy forwards only governed HQ API routes", async () => {
  const seen = [];
  const env = {
    REFRESH_SERVICE: {
      fetch: async (incoming) => {
        seen.push(incoming);
        return Response.json({ ok: true });
      }
    }
  };

  const response = await onRequest({ request: request("/api/refresh/status"), env });
  assert.equal(response.status, 200);
  assert.equal(seen.length, 1);
  assert.equal(new URL(seen[0].url).pathname, "/api/refresh/status");

  const rejected = await onRequest({ request: request("/api/admin"), env });
  assert.equal(rejected.status, 404);
  assert.equal(seen.length, 1);
});

test("Pages refresh proxy enforces route methods", async () => {
  let calls = 0;
  const env = {
    REFRESH_SERVICE: {
      fetch: async () => {
        calls += 1;
        return Response.json({ ok: true });
      }
    }
  };

  assert.equal((await onRequest({ request: request("/api/refresh/hubspot", "GET"), env })).status, 404);
  assert.equal((await onRequest({ request: request("/api/refresh/hubspot", "POST"), env })).status, 200);
  assert.equal((await onRequest({ request: request("/api/data/monday/latest"), env })).status, 200);
  assert.equal((await onRequest({ request: request("/api/data/monday/history?limit=5"), env })).status, 200);
  assert.equal(calls, 3);
});

test("Pages refresh proxy fails closed when the service binding is missing", async () => {
  const response = await onRequest({ request: request("/api/refresh/status"), env: {} });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Refresh service is unavailable." });
});
