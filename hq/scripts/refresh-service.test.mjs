import assert from "node:assert/strict";
import test from "node:test";
import { authorizeManualRefresh, runRefresh, sourcesForCron } from "../refresh-worker/core.mjs";

const ownerEmails = ["owner1@bpp.test", "owner2@bpp.test", "owner3@bpp.test"];

function memoryStore(initialLatest = null) {
  const state = { events: [], latest: initialLatest, jobs: [] };
  return {
    state,
    async startJob(job) {
      state.events.push(`job:start:${job.id}`);
      state.jobs.push({ ...job, status: "running" });
    },
    async putRaw(key, payload) {
      state.events.push(`raw:${key}`);
      state.raw = { key, payload };
    },
    async commitSnapshot(snapshot) {
      state.events.push(`commit:${snapshot.id}`);
      state.latest = snapshot;
    },
    async finishJob(id, result) {
      state.events.push(`job:complete:${id}`);
      Object.assign(state.jobs.find((job) => job.id === id), { status: "completed", result });
    },
    async failJob(id, message) {
      state.events.push(`job:failed:${id}`);
      Object.assign(state.jobs.find((job) => job.id === id), { status: "failed", message });
    }
  };
}

test("archives a validated pull before advancing the latest snapshot", async () => {
  const store = memoryStore();
  const result = await runRefresh({
    source: "quickbooks",
    trigger: "manual",
    actor: "owner1@bpp.test",
    now: new Date("2026-07-31T16:00:00Z"),
    idFactory: () => "job-001",
    adapter: {
      configured: true,
      async pull() {
        return { source: "quickbooks", schema_version: 1, captured_at: "2026-07-31T16:00:00Z", records: [{ revenue: 15143 }] };
      }
    },
    store
  });

  assert.equal(result.status, "completed");
  assert.equal(store.state.latest.source, "quickbooks");
  assert.match(store.state.raw.key, /^raw\/quickbooks\/2026\/07\/31\/job-001\.json$/);
  assert.ok(
    store.state.events.indexOf(`raw:${store.state.raw.key}`) < store.state.events.indexOf("commit:job-001"),
    "Raw history must be durable before latest advances."
  );
});

test("rejects a payload labeled as a different source", async () => {
  const store = memoryStore();
  await assert.rejects(
    runRefresh({
      source: "quickbooks",
      trigger: "manual",
      actor: "owner1@bpp.test",
      now: new Date("2026-07-31T16:00:00Z"),
      idFactory: () => "job-source-mismatch",
      adapter: {
        configured: true,
        async pull() {
          return { source: "hubspot", schema_version: 1, captured_at: "2026-07-31T16:00:00Z", records: [] };
        }
      },
      store
    }),
    /does not match/
  );
  assert.ok(store.state.events.includes("job:failed:job-source-mismatch"));
  assert.ok(!store.state.events.some((event) => event.startsWith("commit:")));
});

test("keeps the last-known-good snapshot when a source pull fails", async () => {
  const previous = { id: "previous", source: "hubspot", captured_at: "2026-07-30T12:00:00Z" };
  const store = memoryStore(previous);

  await assert.rejects(
    runRefresh({
      source: "hubspot",
      trigger: "schedule",
      actor: "system:schedule",
      now: new Date("2026-07-31T16:00:00Z"),
      idFactory: () => "job-002",
      adapter: { configured: true, async pull() { throw new Error("HubSpot unavailable"); } },
      store
    }),
    /HubSpot unavailable/
  );

  assert.equal(store.state.latest, previous, "A failed refresh must not replace last-known-good data.");
  assert.ok(store.state.events.includes("job:failed:job-002"));
  assert.ok(!store.state.events.some((event) => event.startsWith("commit:")));
});

test("returns an honest disabled state without creating a job", async () => {
  const store = memoryStore();
  const result = await runRefresh({
    source: "metricool",
    trigger: "manual",
    actor: "owner1@bpp.test",
    now: new Date("2026-07-31T16:00:00Z"),
    idFactory: () => "job-003",
    adapter: { configured: false, reason: "Connector credentials are not configured." },
    store
  });

  assert.deepEqual(result, {
    source: "metricool",
    status: "disabled",
    reason: "Connector credentials are not configured."
  });
  assert.deepEqual(store.state.events, []);
});

test("allows manual refresh only for the exact BPP owner allowlist", () => {
  assert.equal(authorizeManualRefresh("Owner1@bpp.test", ownerEmails), "owner1@bpp.test");
  assert.throws(() => authorizeManualRefresh("someone@bpp.test", ownerEmails), /not approved/);
  assert.throws(() => authorizeManualRefresh("", ownerEmails), /authenticated owner/);
});

test("runs daily and weekly sources only on their assigned schedules", () => {
  const records = [
    { id: "quickbooks", schedule: "daily" },
    { id: "hubspot", schedule: "daily" },
    { id: "metricool", schedule: "weekly" },
    { id: "workspace", schedule: "weekly-after-monday-brief" }
  ];
  assert.deepEqual(sourcesForCron("15 10 * * *", records).map((record) => record.id), ["quickbooks", "hubspot"]);
  assert.deepEqual(sourcesForCron("30 16 * * MON", records).map((record) => record.id), ["metricool", "workspace"]);
  assert.deepEqual(sourcesForCron("0 0 1 * *", records), []);
});
