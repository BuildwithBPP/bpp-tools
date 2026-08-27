import assert from "node:assert/strict";
import test from "node:test";
import { buildDeliverySnapshot } from "./build-delivery-snapshot.mjs";

const columns = (values) => Object.entries(values).map(([id, value]) => ({ id, text: value?.text ?? "", value: value?.value ? JSON.stringify(value.value) : null }));
const raw = { data: { boards: [{ id: "18406004595", name: "Client Delivery", groups: [
  { id: "group_mm6gebt9", title: "HALO Pathways", items_page: { items: [{ id: "102", name: "HALO plan", updated_at: "2026-08-26T00:00:00Z", column_values: columns({ project_owner: { text: "Eli Fisher" }, project_status: { text: "Not Started" }, project_timeline: { value: { from: "2026-08-29", to: "2026-09-03" } }, status_1: { text: "High" } }), subitems: [{ id: "202", name: "Define scope", updated_at: "2026-08-26T00:00:00Z", column_values: columns({ person: { text: "Eli Fisher" }, status: { text: "Not Started" }, date0: { text: "2026-08-29" } }) }] }] } },
  { id: "group_mm5vja6y", title: "Legacy B. Studio", items_page: { items: [{ id: "101", name: "Legacy design", updated_at: "2026-08-25T00:00:00Z", column_values: columns({ project_owner: { text: "" }, project_status: { text: "Working on it" }, date_mm22kzfc: { text: "2026-09-01" } }), subitems: [{ id: "201", name: "CLIENT: Copy", updated_at: "2026-08-25T00:00:00Z", column_values: columns({ person: { text: "" }, status: { text: "Blocked" }, date0: { text: "" } }) }] }] } },
  { id: "ignore-me", title: "Other", items_page: { items: [{ id: "999", name: "Excluded", updated_at: "2026-08-26T00:00:00Z", column_values: [], subitems: [] }] } }
] }] } };

const config = {
  activeProfile: { id: "eli", displayName: "Eli Fisher" },
  projects: [
    { id: "legacy-b-studio", name: "Legacy B. Studio", groupId: "group_mm5vja6y", mondayUrl: "https://businessplansplus.monday.com/boards/18406004595", owner: "Eli Fisher", color: "navy" },
    { id: "halo-pathways", name: "HALO Pathways", groupId: "group_mm6gebt9", mondayUrl: "https://businessplansplus.monday.com/boards/18406004595", owner: "Eli Fisher", color: "gold" }
  ],
  baselines: {
    deliverables: { "101": { baselineStart: "2026-08-25", baselineDue: "2026-09-01", phase: "execution" }, "102": { baselineStart: "2026-08-29", baselineDue: "2026-09-03", phase: "planning" } },
    tasks: { "201": { baselineDue: null, latestSafeDate: null, priority: "high", checkpointIds: ["cp1"] }, "202": { baselineDue: "2026-08-29", latestSafeDate: "2026-08-29", priority: "high", checkpointIds: [] } }
  },
  checkpoints: [{ id: "cp1", projectId: "legacy-b-studio", name: "Review", plannedDate: "2026-09-01", startsAt: null, outlookEventId: null, outlookUrl: null, requiredTaskIds: ["task-201"], criticalTaskIds: ["task-201"], internalReviewBusinessDays: 1, clientReviewBusinessDays: 1, acceptanceCriteria: ["Copy reviewed"], expectedEvidenceCount: 1, evidenceUrls: [] }],
  raid: []
};

test("builds a deterministic two-project snapshot and preserves missing values", () => {
  const result = buildDeliverySnapshot(raw, config, "2026-08-27T09:00:00Z");
  assert.deepEqual(result.projects.map((item) => item.id), ["legacy-b-studio", "halo-pathways"]);
  assert.deepEqual(result.deliverables.map((item) => item.mondayItemId), ["101", "102"]);
  assert.equal(result.deliverables.some((item) => item.mondayItemId === "999"), false);
  assert.equal(result.tasks.find((item) => item.mondayItemId === "201").owner, null);
  assert.equal(result.tasks.find((item) => item.mondayItemId === "201").currentDue, null);
  assert.equal(result.tasks.find((item) => item.mondayItemId === "201").clientOwned, true);
  assert.deepEqual(result.tasks.find((item) => item.mondayItemId === "201").checkpointIds, ["cp1"]);
});
