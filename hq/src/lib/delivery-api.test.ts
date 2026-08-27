import assert from "node:assert/strict";
import test from "node:test";
import { createDeliveryTask, moveDeliveryTask } from "./delivery-api.ts";

test("public mode is unavailable and never pretends to confirm", async () => {
  const result = await moveDeliveryTask({ apiUrl: "" }, { mondayItemId: "1", dueDate: "2026-08-28", expectedUpdatedAt: "2026-08-26T00:00:00Z" });
  assert.equal(result.syncState, "unavailable");
});

test("move and create send the guarded board payload", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ syncState: "confirmed", message: "ok", mondayUrl: "https://businessplansplus.monday.com/boards/18406004597/pulses/1" }));
  };
  await moveDeliveryTask({ apiUrl: "http://127.0.0.1:8788", fetcher }, { mondayItemId: "1", dueDate: "2026-08-28", expectedUpdatedAt: "2026-08-26T00:00:00Z" });
  await createDeliveryTask({ apiUrl: "http://127.0.0.1:8788", fetcher }, { parentItemId: "2", projectId: "halo-pathways", name: "Build page", dueDate: "2026-08-29", ownerName: "Eli Fisher", status: "Not Started" });
  assert.equal(calls[0].init.method, "PATCH");
  assert.equal(JSON.parse(String(calls[0].init.body)).boardId, "18406004595");
  assert.equal(calls[1].init.method, "POST");
  assert.equal(JSON.parse(String(calls[1].init.body)).projectId, "halo-pathways");
});

test("network failure returns failed instead of confirmed", async () => {
  const fetcher = async () => { throw new Error("offline"); };
  const result = await moveDeliveryTask({ apiUrl: "http://127.0.0.1:8788", fetcher }, { mondayItemId: "1", dueDate: "2026-08-28", expectedUpdatedAt: "2026-08-26T00:00:00Z" });
  assert.equal(result.syncState, "failed");
  assert.match(result.message, /offline/);
});
