# Client Delivery Command Center Core Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `subagent-driven-development` for task-by-task execution, or `executing-plans` for inline execution.

**Goal:** Replace the stale Delivery proof-of-concept page with a checkpoint-first command center for Eli's Legacy B. Studio and HALO Pathways website projects, while keeping Monday authoritative and preserving the repository's no-unsafe-browser-writes boundary.

**Architecture:** Keep the HQ as a static Astro application. Build a typed, deterministic delivery-control engine over a validated snapshot, render Today, Week, Timeline, Projects, and RAID as bookmarkable routes, and expose an explicit mutation client that either uses a loopback-only Monday development adapter or opens the exact Monday item. Do not alter or re-enable the existing recap Worker. Outlook ingestion and authenticated production writes are follow-on releases because they are independent credentialed systems.

**Tech Stack:** Astro 7, TypeScript, Zod, Node 24 built-in test runner, Playwright, axe-core, Monday GraphQL API for the contained development adapter.

**Framework:** DMADV. Define the operating questions and source boundaries; Measure Monday completeness; Analyze checkpoint risk; Design the five views and interaction contract; Verify calculations, source read-back, accessibility, responsive behavior, and failure states.

## Scope challenge and release boundary

A static visual mock is cheaper, but it fails the primary job because it can drift from Monday and cannot prove task changes. A full production PM platform is premature because BPP has no Hub identity boundary yet and Outlook requires a separate Microsoft authorization path.

This plan builds the smallest version that survives both objections:

- full usable command-center views for Legacy B and HALO;
- deterministic readiness, latest-safe-date, collision, gap, and pull-forward logic;
- explicit stale, unavailable, pending, confirmed, conflict, and failed states;
- a Monday mutation contract with read-back semantics;
- a loopback-only development adapter for controlled live testing;
- public/static fallback to the exact Monday item;
- no secret in browser code, committed data, documentation, or browser storage.

Not claimed by this plan:

- live Outlook ingestion or calendar editing;
- authenticated production writes;
- D1 audit persistence;
- permanent deletion;
- non-website package templates;
- invented effort-based utilization.

Those are separate plans after the core is proven useful.

## Source and safety constraints

- Monday board `18406004595` remains authoritative.
- The Hub never creates Hub-only tasks. New work targets a Monday parent deliverable.
- Eli is the default owner profile, but the contained adapter resolves the live Monday user ID at runtime rather than hard-coding an unverified ID.
- Public builds expose no Monday token and no shared bearer secret.
- `/Users/kingeli/code/bpp-tools/worker/src/index.js` is not modified in this plan.
- The development adapter binds only to `127.0.0.1`, allows only the configured local HQ origin, and refuses to start without `MONDAY_API_TOKEN`.
- Automated tests use fake Monday responses. Any real Monday mutation test needs an explicitly selected parent item and a reversible archive cleanup.
- Missing meeting data renders as unavailable. The application never invents a meeting time.
- Baseline dates remain immutable in the snapshot. Date movement changes forecast/current due dates only.

## Target file map

### Create

- `hq/src/domain/delivery/types.ts`
- `hq/src/domain/delivery/schema.ts`
- `hq/src/domain/delivery/control.ts`
- `hq/src/domain/delivery/control.test.ts`
- `hq/src/data/delivery-command.json`
- `hq/src/data/delivery-command.ts`
- `hq/src/components/delivery/DeliveryNav.astro`
- `hq/src/components/delivery/CheckpointHero.astro`
- `hq/src/components/delivery/ControlGapList.astro`
- `hq/src/components/delivery/TaskCard.astro`
- `hq/src/components/delivery/WeekBoard.astro`
- `hq/src/components/delivery/TimelineGantt.astro`
- `hq/src/components/delivery/ProjectControlPanel.astro`
- `hq/src/components/delivery/RaidTable.astro`
- `hq/src/components/delivery/SyncState.astro`
- `hq/src/lib/delivery-api.ts`
- `hq/src/lib/delivery-api.test.ts`
- `hq/src/pages/delivery/week.astro`
- `hq/src/pages/delivery/timeline.astro`
- `hq/src/pages/delivery/projects.astro`
- `hq/src/pages/delivery/raid.astro`
- `hq/scripts/delivery-dev-api.mjs`
- `hq/scripts/delivery-dev-api.test.mjs`
- `hq/scripts/build-delivery-snapshot.mjs`
- `hq/scripts/build-delivery-snapshot.test.mjs`
- `hq/test/fixtures/monday-delivery-response.json`

### Modify

- `hq/src/pages/delivery.astro`
- `hq/src/styles/global.css`
- `hq/src/layouts/HQLayout.astro`
- `hq/src/data/snapshot.ts`
- `hq/scripts/validate.mjs`
- `hq/scripts/capture.mjs`
- `hq/package.json`
- `hq/README.md`
- `hq/docs/implementation-report.md`

## Contract to preserve across every task

```ts
export type DeliveryStatus = "not-started" | "working" | "blocked" | "done" | "cancelled";
export type Readiness = "ready" | "at-risk" | "behind" | "unavailable";
export type SyncState = "snapshot" | "pending" | "confirmed" | "conflict" | "failed" | "unavailable";

export interface DeliveryTask {
  id: string;
  mondayItemId: string;
  mondayUrl: string;
  projectId: string;
  deliverableId: string;
  checkpointIds: string[];
  name: string;
  owner: string | null;
  status: DeliveryStatus;
  priority: "critical" | "high" | "normal" | "low";
  baselineDue: string | null;
  currentDue: string | null;
  latestSafeDate: string | null;
  blockedBy: string[];
  clientOwned: boolean;
  evidenceUrl: string | null;
  sourceUpdatedAt: string;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  name: string;
  startsAt: string | null;
  outlookEventId: string | null;
  outlookUrl: string | null;
  requiredTaskIds: string[];
  criticalTaskIds: string[];
  internalReviewBusinessDays: number;
  clientReviewBusinessDays: number;
  acceptanceCriteria: string[];
  expectedEvidenceCount: number;
}

export interface DeliveryCommandSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  source: { boardId: string; boardName: string; sourceUpdatedAt: string };
  activeProfile: { id: "eli"; displayName: "Eli Fisher" };
  projects: DeliveryProject[];
  deliverables: Deliverable[];
  tasks: DeliveryTask[];
  checkpoints: Checkpoint[];
  raid: RaidRecord[];
}
```

The exact interfaces added in Task 1 must include `DeliveryProject`, `Deliverable`, `RaidRecord`, `CheckpointAssessment`, `ControlGap`, and `DeliveryMutationResult`. Later tasks may extend fields only through a schema-versioned change and tests.

---

## Task 1: Establish the typed delivery snapshot and truthful initial data

**Files:**

- Create: `hq/src/domain/delivery/types.ts`
- Create: `hq/src/domain/delivery/schema.ts`
- Create: `hq/src/data/delivery-command.json`
- Create: `hq/src/data/delivery-command.ts`
- Modify: `hq/src/data/snapshot.ts`
- Test: `hq/src/domain/delivery/control.test.ts`

**Step 1: Write the failing schema test**

Add a test that loads the committed snapshot, asserts schema version 1, the two approved project IDs, every task's Monday item URL, and null meeting fields where Outlook evidence is unavailable.

```ts
import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../../data/delivery-command.json" with { type: "json" };
import { deliveryCommandSchema } from "./schema.ts";

test("the committed command snapshot is valid and limited to the approved projects", () => {
  const parsed = deliveryCommandSchema.parse(snapshot);
  assert.deepEqual(parsed.projects.map((project) => project.id).sort(), ["halo-pathways", "legacy-b-studio"]);
  assert.ok(parsed.tasks.every((task) => task.mondayUrl.startsWith("https://")));
  assert.ok(parsed.checkpoints.every((checkpoint) =>
    checkpoint.outlookEventId === null || checkpoint.startsAt !== null
  ));
});
```

**Step 2: Run the test and confirm the expected failure**

Run: `cd hq && node --test src/domain/delivery/control.test.ts`

Expected: FAIL because `schema.ts` and the snapshot do not exist.

**Step 3: Implement the interfaces and Zod schema**

Implement strict enums, ISO date strings, nullable meeting fields, URL validation, immutable baseline fields, and `.superRefine()` checks for unique IDs and valid cross-references.

```ts
export const deliveryCommandSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  source: z.object({
    boardId: z.literal("18406004595"),
    boardName: z.string().min(1),
    sourceUpdatedAt: z.string().datetime()
  }),
  activeProfile: z.object({ id: z.literal("eli"), displayName: z.literal("Eli Fisher") }),
  projects: z.array(projectSchema).length(2),
  deliverables: z.array(deliverableSchema),
  tasks: z.array(taskSchema),
  checkpoints: z.array(checkpointSchema),
  raid: z.array(raidSchema)
}).superRefine(validateReferences);
```

Build `delivery-command.json` only from verified Monday IDs/dates already captured for the two clients. Leave unverified owners, dependencies, evidence, and Outlook fields null/empty so the UI surfaces gaps instead of inventing facts.

**Step 4: Add one validated loader**

```ts
import source from "./delivery-command.json";
import { deliveryCommandSchema } from "../domain/delivery/schema";

export const deliveryCommand = deliveryCommandSchema.parse(source);
```

Remove `deliverySnapshot` from `snapshot.ts` only after all delivery imports are moved to this loader.

**Step 5: Run tests and type check**

Run: `cd hq && node --test src/domain/delivery/control.test.ts && npx astro check`

Expected: PASS.

**Step 6: Commit**

```bash
git add hq/src/domain/delivery hq/src/data/delivery-command.json hq/src/data/delivery-command.ts hq/src/data/snapshot.ts
git commit -m "feat(hq): add typed client delivery snapshot"
```

---

## Task 2: Build the deterministic control engine

**Files:**

- Create: `hq/src/domain/delivery/control.ts`
- Modify: `hq/src/domain/delivery/control.test.ts`

**Step 1: Write failing tests for business-day math and readiness**

Cover:

- Friday minus one business day is Thursday;
- Monday minus one business day is Friday;
- incomplete noncritical work is At Risk;
- a blocked critical task is Behind;
- a missed latest-safe date is Behind;
- all required tasks done plus required evidence is Ready;
- a checkpoint with no date is Unavailable;
- percentage is simple completed-required divided by total required;
- baseline values are never mutated.

```ts
test("critical blocked work makes a checkpoint behind", () => {
  const result = assessCheckpoint(fixture, "halo-design-review", "2026-08-26");
  assert.equal(result.readiness, "behind");
  assert.match(result.reasons.join(" "), /blocked/i);
});
```

**Step 2: Run the test and confirm failure**

Run: `cd hq && node --test src/domain/delivery/control.test.ts`

Expected: FAIL because control functions do not exist.

**Step 3: Implement pure functions**

Implement and export:

```ts
export function subtractBusinessDays(date: string, days: number): string;
export function assessCheckpoint(snapshot: DeliveryCommandSnapshot, checkpointId: string, today: string): CheckpointAssessment;
export function findControlGaps(snapshot: DeliveryCommandSnapshot): ControlGap[];
export function findWorkloadCollisions(snapshot: DeliveryCommandSnapshot): WorkloadCollision[];
export function rankPullForwardTasks(snapshot: DeliveryCommandSnapshot, today: string): DeliveryTask[];
export function groupTasksByDay(snapshot: DeliveryCommandSnapshot, weekStart: string): Map<string, DeliveryTask[]>;
export function calculateKpis(snapshot: DeliveryCommandSnapshot, today: string): DeliveryKpis;
```

Use UTC date-only helpers. Rank pull-forward work by criticality, checkpoint proximity, dependency release, then due date. Do not call it capacity.

**Step 4: Run focused tests**

Run: `cd hq && node --test src/domain/delivery/control.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add hq/src/domain/delivery
git commit -m "feat(hq): add delivery control calculations"
```

---

## Task 3: Add the delivery shell and five bookmarkable views

**Files:**

- Create: `hq/src/components/delivery/DeliveryNav.astro`
- Create: `hq/src/pages/delivery/week.astro`
- Create: `hq/src/pages/delivery/timeline.astro`
- Create: `hq/src/pages/delivery/projects.astro`
- Create: `hq/src/pages/delivery/raid.astro`
- Modify: `hq/src/pages/delivery.astro`
- Modify: `hq/scripts/validate.mjs`
- Modify: `hq/scripts/capture.mjs`

**Step 1: Extend the static validator first**

Add the four secondary route outputs and assert that every delivery page has one subnavigation whose current link matches the route.

```js
const deliveryRoutes = [
  "delivery/index.html",
  "delivery/week/index.html",
  "delivery/timeline/index.html",
  "delivery/projects/index.html",
  "delivery/raid/index.html"
];
```

Run: `cd hq && npm run build && npm run validate`

Expected: FAIL on missing secondary routes.

**Step 2: Create accessible subnavigation and route shells**

```astro
<nav class="delivery-nav" aria-label="Client delivery views">
  <a href="/delivery/" aria-current={current === "today" ? "page" : undefined}>Today</a>
  <a href="/delivery/week/" aria-current={current === "week" ? "page" : undefined}>Week</a>
  <a href="/delivery/timeline/" aria-current={current === "timeline" ? "page" : undefined}>Timeline</a>
  <a href="/delivery/projects/" aria-current={current === "projects" ? "page" : undefined}>Projects</a>
  <a href="/delivery/raid/" aria-current={current === "raid" ? "page" : undefined}>RAID</a>
</nav>
```

Each route receives the same source/freshness metadata from `deliveryCommand`, exactly one `h1`, and a concise unavailable state where its view component is not yet built.

**Step 3: Add the routes to browser QA**

Exercise all five delivery routes at 1440, 1024, 768, and 390 pixels. Keep WCAG A/AA checks at desktop and mobile.

**Step 4: Run validation**

Run: `cd hq && npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add hq/src/components/delivery/DeliveryNav.astro hq/src/pages/delivery hq/scripts
git commit -m "feat(hq): add client delivery view routes"
```

---

## Task 4: Implement the checkpoint-first Today view

**Files:**

- Create: `hq/src/components/delivery/CheckpointHero.astro`
- Create: `hq/src/components/delivery/ControlGapList.astro`
- Create: `hq/src/components/delivery/SyncState.astro`
- Modify: `hq/src/pages/delivery.astro`
- Modify: `hq/src/styles/global.css`
- Modify: `hq/scripts/validate.mjs`

**Step 1: Add failing page-contract assertions**

Assert the built Today route includes:

- `data-delivery-view="today"`;
- next checkpoint;
- readiness label;
- baseline and forecast;
- latest-safe date/rule;
- due/overdue/blocked/client-input/gap KPIs;
- `data-extra-time-queue`;
- source freshness and sync state;
- no made-up meeting time when Outlook data is missing.

**Step 2: Run validation and confirm failure**

Run: `cd hq && npm test`

Expected: FAIL on missing Today contracts.

**Step 3: Render the control model**

Build the page in this order:

1. project filter and sync state;
2. next protected checkpoint hero;
3. KPI strip;
4. Now / Next / Waiting task lanes;
5. threats and downstream effects;
6. control gaps;
7. extra-time pull-forward queue;
8. explicit Outlook-unavailable callout when applicable.

```astro
<CheckpointHero
  checkpoint={nextCheckpoint}
  assessment={assessment}
  showMeetingUnavailable={nextCheckpoint.startsAt === null}
/>
```

Use text plus color for status, visible calculation rules, and Monday deep links on every task.

**Step 4: Add responsive styles**

At 320/390px, stack the hero, KPIs, and task lanes. At 768px, use two columns where safe. At 1024/1440px, keep the checkpoint and next actions above the fold. No horizontal page overflow.

**Step 5: Run tests and inspect screenshots**

Run:

```bash
cd hq
npm test
npm run preview -- --host 127.0.0.1
# second terminal
npm run screenshots
```

Expected: static validation, WCAG checks, and all viewports pass; screenshots show no clipping or hidden action links.

**Step 6: Commit**

```bash
git add hq/src/components/delivery hq/src/pages/delivery.astro hq/src/styles/global.css hq/scripts/validate.mjs
git commit -m "feat(hq): build checkpoint-first delivery today view"
```

---

## Task 5: Implement the Monday-to-Sunday Week view and safe interactions

**Files:**

- Create: `hq/src/components/delivery/TaskCard.astro`
- Create: `hq/src/components/delivery/WeekBoard.astro`
- Create: `hq/src/lib/delivery-api.ts`
- Create: `hq/src/lib/delivery-api.test.ts`
- Modify: `hq/src/pages/delivery/week.astro`
- Modify: `hq/src/styles/global.css`
- Modify: `hq/package.json`

**Step 1: Write failing API-client tests**

Test:

- no configured API returns `unavailable` and preserves the Monday URL;
- successful due-date update returns `confirmed` only when read-back matches;
- stale version returns `conflict`;
- network failure returns `failed` with attempted values intact;
- create-task defaults owner to Eli, status to Not Started, and due date to selected day;
- permanent delete is rejected.

```ts
test("a write is confirmed only after matching read-back", async () => {
  const result = await updateTaskDueDate(input, fakeFetchSequence([accepted, matchingReadBack]));
  assert.equal(result.syncState, "confirmed");
  assert.equal(result.record.currentDue, "2026-08-29");
});
```

**Step 2: Run the focused test and confirm failure**

Run: `cd hq && node --test src/lib/delivery-api.test.ts`

Expected: FAIL because the API client does not exist.

**Step 3: Implement the mutation client**

```ts
export interface DeliveryApiConfig {
  baseUrl: string | null;
}

export async function updateTaskDueDate(
  input: { taskId: string; mondayItemId: string; expectedUpdatedAt: string; dueDate: string },
  fetcher: typeof fetch = fetch
): Promise<DeliveryMutationResult>;

export async function createTask(
  input: { parentItemId: string; name: string; dueDate: string; ownerProfile: "eli"; status: "not-started" },
  fetcher: typeof fetch = fetch
): Promise<DeliveryMutationResult>;
```

The browser reads `data-delivery-api-url` from the Week root. The value is empty in production builds. Never inject a token.

**Step 4: Build the Week interface**

Render Monday through Sunday with:

- due-date task cards;
- non-draggable checkpoint/review markers;
- client inputs;
- risk badges;
- daily done/open counts;
- weekly control gaps;
- collision warnings;
- extra-time queue;
- sync state on each card.

Support drag with a keyboard-equivalent Move action. A drop opens a confirmation dialog showing old date, new date, latest-safe date, and checkpoint impact. Until confirmed, the original card remains in place with a pending preview.

Add Task opens a dialog prefilled with Eli, Not Started, selected date, and inferred deliverable. Require deliverable selection if context is ambiguous.

**Step 5: Add scripts and run all tests**

Update:

```json
"test:unit": "node --test src/domain/delivery/*.test.ts src/lib/*.test.ts scripts/*.test.mjs",
"test": "npm run test:unit && npm run build && node scripts/validate.mjs"
```

Run: `cd hq && npm test`

Expected: PASS.

**Step 6: Commit**

```bash
git add hq/src/components/delivery hq/src/lib hq/src/pages/delivery/week.astro hq/src/styles/global.css hq/package.json hq/package-lock.json
git commit -m "feat(hq): add actionable delivery week view"
```

---

## Task 6: Implement Timeline, Projects, and RAID views

**Files:**

- Create: `hq/src/components/delivery/TimelineGantt.astro`
- Create: `hq/src/components/delivery/ProjectControlPanel.astro`
- Create: `hq/src/components/delivery/RaidTable.astro`
- Modify: `hq/src/pages/delivery/timeline.astro`
- Modify: `hq/src/pages/delivery/projects.astro`
- Modify: `hq/src/pages/delivery/raid.astro`
- Modify: `hq/src/styles/global.css`
- Modify: `hq/scripts/validate.mjs`

**Step 1: Add failing route contracts**

Assert:

- Timeline has baseline and forecast legends, Today marker, tasks/deliverables/checkpoints, and explicit no-dependency state when Monday has no dependency data.
- Projects shows scope classification, deliverable breakdown, acceptance criteria, evidence gaps, baseline/current dates, and plan-completeness gaps.
- RAID shows all four types, owner/status/review date, affected checkpoint, and source/evidence columns; empty types render truthful empty states.

**Step 2: Run validation and confirm failure**

Run: `cd hq && npm test`

Expected: FAIL on missing route contracts.

**Step 3: Implement the Gantt**

Use semantic HTML plus CSS grid. Do not use a canvas-only chart. Every bar needs an accessible text row and Monday link. Baseline renders as a thin fixed rail; current forecast renders as the interactive bar. Deliverables and checkpoints are not draggable.

**Step 4: Implement project controls**

For each client render:

- baseline scope and classification;
- deliverables and subitems;
- checkpoint sequence;
- missing owner/date/checkpoint/evidence/dependency data;
- accepted baseline versus current forecast;
- changes as unavailable until an audit store exists.

**Step 5: Implement RAID**

Use the validated control snapshot. No browser-only RAID writes in this release. Provide a documented Monday/source link fallback and clearly label the read-only state.

**Step 6: Run browser QA**

Run: `cd hq && npm test && npm run screenshots`

Expected: all routes pass at four viewports with no horizontal page overflow. The Gantt may scroll within its labeled region, not the page.

**Step 7: Commit**

```bash
git add hq/src/components/delivery hq/src/pages/delivery hq/src/styles/global.css hq/scripts
git commit -m "feat(hq): add delivery timeline projects and raid views"
```

---

## Task 7: Add the loopback-only Monday adapter and verified read-back

**Files:**

- Create: `hq/scripts/delivery-dev-api.mjs`
- Create: `hq/scripts/delivery-dev-api.test.mjs`
- Modify: `hq/package.json`
- Modify: `hq/README.md`

**Step 1: Write failing adapter tests with fake Monday fetches**

Cover:

- refuses to start without `MONDAY_API_TOKEN`;
- binds to `127.0.0.1`, not `0.0.0.0`;
- rejects non-local Origin;
- rejects an unexpected board ID;
- resolves Monday column IDs and Eli's user ID from live metadata;
- rejects stale `expectedUpdatedAt` before mutation;
- changes a subitem due date, queries the item again, and returns confirmed only on a match;
- creates a subitem under the requested parent, reads it back, and returns its Monday URL;
- archives but never permanently deletes;
- returns status plus the first 500 response characters for upstream errors.

**Step 2: Run tests and confirm failure**

Run: `cd hq && node --test scripts/delivery-dev-api.test.mjs`

Expected: FAIL because the adapter does not exist.

**Step 3: Implement strict server boundaries**

```js
export function startDeliveryDevApi({ token, port = 8788, fetcher = fetch }) {
  if (!token) throw new Error("MONDAY_API_TOKEN is required");
  return createServer((request, response) => route(request, response, { token, fetcher }))
    .listen(port, "127.0.0.1");
}
```

Allow only:

- `GET /health`;
- `GET /owners`;
- `PATCH /tasks/:mondayItemId/due-date`;
- `POST /deliverables/:parentItemId/tasks`;
- `POST /tasks/:mondayItemId/archive`.

Validate board `18406004595`, parent deliverable membership, subitem membership, ISO dates, maximum name length, allowed statuses, expected source timestamp, and request body size. Discover column IDs by board metadata. Resolve Eli by exact live Monday name and fail closed if ambiguous.

Use Monday GraphQL calls with server-side token only. After every mutation, query the exact item and compare the resulting values before returning `confirmed`.

**Step 4: Add development scripts**

```json
"dev:delivery-api": "node scripts/delivery-dev-api.mjs",
"dev:delivery": "PUBLIC_DELIVERY_API_URL=http://127.0.0.1:8788 astro dev"
```

Document two-terminal local startup without showing or storing a token:

```bash
MONDAY_API_TOKEN='<set in shell only>' npm run dev:delivery-api
npm run dev:delivery
```

**Step 5: Run automated tests**

Run: `cd hq && npm test`

Expected: PASS using only fake API responses.

**Step 6: Controlled live smoke test**

Before this step, identify one approved Legacy B or HALO parent deliverable and tell Eli the exact test subitem name and cleanup action. Only proceed with confirmation.

Test sequence:

1. create `QA - Delivery Hub sync test` as a subitem;
2. verify owner resolves to Eli, status is Not Started, and due date matches the selected day;
3. move it one day through the Week view;
4. read the exact item back from Monday;
5. archive the test subitem;
6. read back the archived state if the API exposes it;
7. record no credentials or response payloads containing sensitive data.

Expected: the UI shows Confirmed only after the matching read-back. If any call fails, capture HTTP status plus the first 500 characters before diagnosing.

**Step 7: Commit**

```bash
git add hq/scripts/delivery-dev-api.mjs hq/scripts/delivery-dev-api.test.mjs hq/package.json hq/package-lock.json hq/README.md
git commit -m "feat(hq): add contained Monday delivery adapter"
```

---

## Task 8: Add reproducible Monday snapshot generation

**Files:**

- Create: `hq/scripts/build-delivery-snapshot.mjs`
- Create: `hq/scripts/build-delivery-snapshot.test.mjs`
- Create: `hq/test/fixtures/monday-delivery-response.json`
- Modify: `hq/package.json`
- Modify: `hq/README.md`

**Step 1: Write a failing transformation test**

The fixture must include:

- both approved client groups;
- parent deliverables and subitems;
- missing owner/date/dependency cases;
- completed and open work;
- Monday URLs and source timestamps;
- one unknown group proving it is excluded.

Assert deterministic sorting and stable JSON output.

**Step 2: Run and confirm failure**

Run: `cd hq && node --test scripts/build-delivery-snapshot.test.mjs`

Expected: FAIL because the builder does not exist.

**Step 3: Implement pure transformation plus optional live fetch**

```js
export function buildDeliverySnapshot(raw, controlConfig, generatedAt) {
  // include only Legacy B and HALO group IDs
  // normalize deliverables/subitems
  // retain nulls for missing data
  // preserve baseline fields from controlConfig
  // return schemaVersion 1
}
```

The CLI accepts either `--input <raw-json>` or a shell-only `MONDAY_API_TOKEN`. It writes only `src/data/delivery-command.json`, validates before replacing, and prints counts for projects, deliverables, tasks, missing owners, missing dates, and dependencies.

Do not overwrite baseline fields from Monday forecast changes. Use a small checked-in control configuration inside the generated JSON for checkpoint associations until D1 exists.

**Step 4: Add scripts**

```json
"delivery:refresh": "node scripts/build-delivery-snapshot.mjs",
"delivery:check": "node scripts/build-delivery-snapshot.mjs --input test/fixtures/monday-delivery-response.json --check"
```

**Step 5: Run tests and a fixture refresh**

Run:

```bash
cd hq
npm run delivery:check
npm test
```

Expected: PASS and no diff to the committed snapshot during `--check`.

**Step 6: Commit**

```bash
git add hq/scripts/build-delivery-snapshot* hq/test/fixtures hq/package.json hq/package-lock.json hq/README.md
git commit -m "feat(hq): add delivery snapshot refresh pipeline"
```

---

## Task 9: Final verification, visual QA, and honest handoff

**Files:**

- Modify: `hq/scripts/capture.mjs`
- Modify: `hq/scripts/validate.mjs`
- Modify: `hq/docs/implementation-report.md`
- Modify: `hq/README.md`

**Step 1: Expand end-to-end browser checks**

For Today, Week, Timeline, Projects, and RAID, test:

- 1440, 1024, 768, 390, and 320 widths;
- no page overflow;
- one `h1`;
- current delivery subtab;
- visible source and freshness;
- keyboard access to task Move and Add Task;
- non-draggable meeting/checkpoint cards;
- correct unavailable state without API URL;
- Monday links present;
- no console errors;
- WCAG A/AA at desktop and mobile.

Take full-page screenshots for all five delivery views at 1440 and 390.

**Step 2: Run the complete gate**

```bash
cd hq
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1
# second terminal
npm run screenshots
```

Expected: all commands pass, no axe violations, no console errors, and artifacts render correctly.

**Step 3: Inspect every screenshot manually**

Check hierarchy, clipping, text overlap, card density, Gantt labels, focus visibility, 320px behavior, and color-independent status meaning. Fix issues and rerun the whole gate.

**Step 4: Update documentation**

Document:

- what is implemented and tested;
- exact sources and snapshot time;
- local Monday write setup;
- production write fallback;
- Outlook unavailable status;
- current limitations;
- next two plans: Outlook checkpoint ingestion, then authenticated Worker/D1 production access.

Do not say “live,” “synced,” or “complete” without a verified live read-back.

**Step 5: Self-review the branch**

Run:

```bash
git status --short
git diff --check
git diff main...HEAD --stat
git log --oneline --decorate -12
```

Review for accidental secrets, changes to `worker/src/index.js`, unrelated user work, stale claims, and missing source links.

**Step 6: Commit**

```bash
git add hq/scripts hq/README.md hq/docs/implementation-report.md
git commit -m "docs(hq): verify client delivery command center"
```

## Completion criteria

This plan is complete only when:

- all five delivery views render from the validated Legacy B and HALO snapshot;
- Today answers what to do now, what checkpoint is protected, what threatens it, and what to pull forward;
- Week supports Monday-to-Sunday planning, accessible movement, Add Task defaults, and explicit sync states;
- Timeline differentiates baseline and forecast and does not fabricate dependencies;
- Projects exposes scope, acceptance, evidence, and plan gaps;
- RAID is truthful and linked to affected work;
- unit, static, type, responsive, console, and WCAG gates pass;
- automated Monday adapter tests pass;
- any real Monday test has matching read-back and reversible cleanup;
- the public build contains no token and cannot perform unauthenticated writes;
- Outlook is labeled unavailable until its separate integration is built;
- the implementation report states the actual state without caveats hidden behind “done.”

## Follow-on plans

1. **Outlook checkpoint ingestion:** Microsoft Graph authorization, event matching, attendee/title mapping, review/send-by derivation, event deep links, and conflict/failure states.
2. **Authenticated production delivery service:** Cloudflare Access or equivalent identity, Worker API, D1 control/audit store, optimistic concurrency, production Monday writes, archive audit, and then carefully gated permanent deletion.
3. **Website blueprint generator:** configurable pre-kickoff package template that creates/validates Monday deliverable and subitem structure for future clients.
