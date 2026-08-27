import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCheckpoint,
  calculateKpis,
  findControlGaps,
  rankPullForwardTasks,
  subtractBusinessDays
} from "./control.ts";
import type { DeliveryCommandSnapshot } from "./types.ts";

const fixture: DeliveryCommandSnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-08-26T00:24:52Z",
  source: {
    boardId: "18406004595",
    boardName: "Client Delivery",
    sourceUpdatedAt: "2026-08-26T00:24:52Z"
  },
  activeProfile: { id: "eli", displayName: "Eli Fisher" },
  projects: [{
    id: "halo-pathways",
    name: "HALO Pathways",
    groupId: "group_mm6gebt9",
    mondayUrl: "https://businessplansplus.monday.com/boards/18406004595",
    owner: "Eli Fisher",
    color: "gold"
  }],
  deliverables: [{
    id: "d1",
    mondayItemId: "1",
    mondayUrl: "https://businessplansplus.monday.com/boards/18406004595/pulses/1",
    projectId: "halo-pathways",
    name: "Design direction",
    owner: "Eli Fisher",
    status: "not-started",
    priority: "critical",
    phase: "execution",
    baselineStart: "2026-08-31",
    baselineDue: "2026-09-08",
    currentStart: "2026-08-31",
    currentDue: "2026-09-08",
    dependencyIds: [],
    definitionOfDone: "Written approval",
    sourceUpdatedAt: "2026-08-26T00:00:00Z"
  }],
  tasks: [
    {
      id: "t1",
      mondayItemId: "2",
      mondayUrl: "https://businessplansplus.monday.com/boards/18406004597/pulses/2",
      projectId: "halo-pathways",
      deliverableId: "d1",
      checkpointIds: ["cp1"],
      name: "Prepare options",
      owner: "Eli Fisher",
      status: "not-started",
      priority: "critical",
      baselineDue: "2026-09-04",
      currentDue: "2026-09-04",
      latestSafeDate: "2026-09-04",
      blockedBy: [],
      clientOwned: false,
      evidenceUrl: null,
      sourceUpdatedAt: "2026-08-26T00:00:00Z"
    },
    {
      id: "t2",
      mondayItemId: "3",
      mondayUrl: "https://businessplansplus.monday.com/boards/18406004597/pulses/3",
      projectId: "halo-pathways",
      deliverableId: "d1",
      checkpointIds: ["cp1"],
      name: "Client input",
      owner: null,
      status: "blocked",
      priority: "high",
      baselineDue: "2026-09-03",
      currentDue: "2026-09-03",
      latestSafeDate: "2026-09-03",
      blockedBy: [],
      clientOwned: true,
      evidenceUrl: null,
      sourceUpdatedAt: "2026-08-26T00:00:00Z"
    }
  ],
  checkpoints: [{
    id: "cp1",
    projectId: "halo-pathways",
    name: "Design review",
    plannedDate: "2026-09-08",
    startsAt: null,
    outlookEventId: null,
    outlookUrl: null,
    requiredTaskIds: ["t1", "t2"],
    criticalTaskIds: ["t1"],
    internalReviewBusinessDays: 1,
    clientReviewBusinessDays: 1,
    acceptanceCriteria: ["Options reviewed"],
    expectedEvidenceCount: 1,
    evidenceUrls: []
  }],
  raid: []
};

test("business-day subtraction crosses a weekend", () => {
  assert.equal(subtractBusinessDays("2026-08-31", 1), "2026-08-28");
  assert.equal(subtractBusinessDays("2026-09-04", 1), "2026-09-03");
});

test("a blocked prerequisite makes the checkpoint behind", () => {
  const result = assessCheckpoint(fixture, "cp1", "2026-08-26");
  assert.equal(result.readiness, "behind");
  assert.match(result.reasons.join(" "), /blocked/i);
  assert.equal(result.completionPercent, 0);
});

test("a checkpoint without a real Outlook time remains usable but flags calendar mapping", () => {
  const gaps = findControlGaps(fixture);
  assert.ok(gaps.some((gap) => gap.kind === "meeting"));
  assert.ok(gaps.some((gap) => gap.kind === "evidence"));
  assert.ok(gaps.some((gap) => gap.kind === "dependency"));
});

test("KPIs and pull-forward ranking remain actionable without capacity math", () => {
  const kpis = calculateKpis(fixture, "2026-08-26");
  assert.equal(kpis.blocked, 1);
  assert.equal(kpis.awaitingClient, 1);
  assert.equal(rankPullForwardTasks(fixture, "2026-08-26")[0].id, "t1");
});

test("completed tasks do not create current control-gap noise", () => {
  const completed = structuredClone(fixture);
  completed.tasks[0].status = "done";
  completed.tasks[0].owner = null;
  completed.tasks[0].currentDue = null;
  completed.tasks[0].checkpointIds = [];
  const gaps = findControlGaps(completed);
  assert.ok(!gaps.some((gap) => gap.workId === "t1"));
});

test("open template subitems under a completed parent are not current work", () => {
  const completedParent = structuredClone(fixture);
  completedParent.deliverables[0].status = "done";
  completedParent.tasks[0].owner = null;
  completedParent.tasks[0].currentDue = null;
  completedParent.tasks[0].checkpointIds = [];
  assert.ok(!findControlGaps(completedParent).some((gap) => gap.workId === "t1"));
  assert.ok(!rankPullForwardTasks(completedParent, "2026-08-26").some((task) => task.id === "t1"));
  assert.equal(calculateKpis(completedParent, "2026-08-26").blocked, 0);
});
