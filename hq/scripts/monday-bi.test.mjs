import assert from "node:assert/strict";
import test from "node:test";

let summarizeMondaySnapshot;
try {
  ({ summarizeMondaySnapshot } = await import("../refresh-worker/monday-bi.mjs"));
} catch {
  // The first TDD run must fail because the production module does not exist yet.
}

const fixture = {
  schema_version: 1,
  source: "monday",
  captured_at: "2026-08-01T12:00:00.000Z",
  records: [
    {
      kind: "board",
      id: "18406004595",
      name: "Client Projects",
      groups: [
        { id: "client-alpha", title: "Client Alpha" },
        { id: "client-beta", title: "Client Beta" },
        { id: "new_group29179", title: "⭐ NEW CLIENT TEMPLATE" }
      ],
      items: [
        {
          id: "delivery-1",
          name: "Milestone 1",
          updated_at: "2026-07-31T15:00:00Z",
          group: { id: "client-alpha", title: "Client Alpha" },
          column_values: [
            { id: "project_status", type: "status", text: "In Progress", value: "{}" },
            { id: "date_mm22kzfc", type: "date", text: "2026-07-30", value: "{\"date\":\"2026-07-30\"}" }
          ],
          subitems: [
            {
              id: "task-1",
              name: "Draft",
              updated_at: "2026-07-31T16:00:00Z",
              column_values: [
                { id: "project_status", type: "status", text: "Working on it", value: "{}" },
                { id: "date_mm22kzfc", type: "date", text: "2026-07-29", value: "{\"date\":\"2026-07-29\"}" }
              ]
            },
            {
              id: "task-2",
              name: "Review",
              updated_at: "2026-07-30T12:00:00Z",
              column_values: [
                { id: "project_status", type: "status", text: "Done", value: "{}" },
                { id: "date_mm22kzfc", type: "date", text: "2026-07-28", value: "{\"date\":\"2026-07-28\"}" }
              ]
            }
          ]
        },
        {
          id: "delivery-2",
          name: "Closeout",
          updated_at: "2026-08-01T10:00:00Z",
          group: { id: "client-beta", title: "Client Beta" },
          column_values: [
            { id: "project_status", type: "status", text: "Done", value: "{}" },
            { id: "date_mm22kzfc", type: "date", text: "2026-07-31", value: "{\"date\":\"2026-07-31\"}" }
          ],
          subitems: []
        },
        {
          id: "delivery-template",
          name: "Project Kickoff",
          updated_at: "2026-08-01T10:00:00Z",
          group: { id: "new_group29179", title: "⭐ NEW CLIENT TEMPLATE" },
          column_values: [{ id: "project_status", type: "status", text: "Not Started", value: "{}" }],
          subitems: []
        }
      ]
    },
    {
      kind: "board",
      id: "18406003425",
      name: "BPP Operations",
      groups: [],
      items: [
        {
          id: "ops-1",
          name: "HQ connector",
          updated_at: "2026-08-01T09:00:00Z",
          group: { id: "sprint-4", title: "Sprint 4 Backlog" },
          column_values: [{ id: "project_status", type: "status", text: "In Progress", value: "{}" }],
          subitems: []
        }
      ]
    }
  ]
};

test("summarizes client delivery while treating subitems as first-class work", () => {
  assert.equal(typeof summarizeMondaySnapshot, "function", "Monday BI summarizer must be implemented.");
  const summary = summarizeMondaySnapshot(fixture, new Date("2026-08-01T23:00:00Z"));

  assert.deepEqual(summary.metrics, {
    tracked_client_count: 2,
    open_deliverable_count: 1,
    open_task_count: 1,
    overdue_work_count: 2,
    at_risk_client_count: 1,
    in_progress_work_count: 2
  });
  assert.deepEqual(summary.clients, [
    {
      id: "client-alpha",
      client: "Client Alpha",
      open_deliverables: 1,
      open_tasks: 1,
      overdue_work: 2,
      last_updated: "2026-07-31T16:00:00Z",
      health: "at-risk"
    },
    {
      id: "client-beta",
      client: "Client Beta",
      open_deliverables: 0,
      open_tasks: 0,
      overdue_work: 0,
      last_updated: "2026-08-01T10:00:00Z",
      health: "current"
    }
  ]);
  assert.equal(summary.captured_at, fixture.captured_at);
  assert.equal(summary.record_count, 2);
});

test("rejects invalid Monday envelopes", () => {
  assert.equal(typeof summarizeMondaySnapshot, "function", "Monday BI summarizer must be implemented.");
  assert.throws(() => summarizeMondaySnapshot({ ...fixture, source: "hubspot" }), /Monday snapshot/);
  assert.throws(() => summarizeMondaySnapshot({ ...fixture, records: null }), /records/);
});
