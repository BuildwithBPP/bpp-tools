# UX Handoff: Client Delivery Command Center

**Status:** READY  
**UX brief:** `.scratch/client-delivery-command-center/ux/ux-brief.md`  
**Prototype/design:** `docs/superpowers/specs/2026-08-26-client-delivery-command-center-design.md`  
**Approved by:** Eli Fisher, 2026-08-26  
**Build target:** `hq/` in `bpp-tools`

## Decision

- Problem being solved: Eli cannot quickly see which work protects the next client checkpoint or whether the current plan is complete.
- Primary user/job/context: Eli, Client Delivery and Design DRI, running Legacy B and HALO during limited nights/weekends time.
- Desired user behavior and business outcome: Open one view, choose the correct next action, keep Monday current, and surface checkpoint risk early.
- Selected experience direction: Checkpoint-first Today plus Week, Timeline, Projects, and RAID views over Monday-owned work.
- Why this direction won: It adds planning intelligence while preserving Monday and Outlook as sources of truth.
- Explicit non-goals: Public writes, permanent deletion, effort-based utilization, Outlook integration in the core release, non-website templates.

## Evidence

| Claim | Evidence | Confidence | Build implication |
|---|---|---|---|
| Today must answer what protects the next meeting. | Approved design sections 1 and 5 | high | Next checkpoint leads the page. |
| Week must support extra-time planning. | Eli's prototype feedback | high | Rank safe pull-forward tasks. |
| Movement must sync or revert. | Eli's explicit question and approval | high | Use pending/confirmed/conflict/failed states and read-back. |
| No in-app sign-in exists yet. | User decision plus repo containment note | high | Public build is read-only with Monday links. |

## Critical journeys

### J-01: Decide what to do now

Entry: `/delivery/`. Goal: choose the next action. Steps: read next checkpoint and readiness, inspect latest-safe date, review Now/Next/Waiting, choose task or pull-forward work. Exit: open exact Monday task. Recovery: stale/unavailable banner explains what cannot be trusted.

### J-02: Plan or adjust the week

Entry: `/delivery/week/`. Goal: place work on the right day. Steps: scan Monday-Sunday, select Move, preview date/checkpoint impact, confirm, wait for read-back. Exit: Confirmed state. Recovery: conflict compares attempted/current value; failure reverts and preserves Open in Monday.

### J-03: Add missing work

Entry: day, checkpoint, or deliverable Add Task. Goal: create a Monday subitem. Steps: confirm client/deliverable, review default owner Eli/status Not Started/date, save, wait for read-back. Exit: confirmed card with Monday URL. Recovery: ambiguous parent requires selection; unavailable API opens Monday.

### J-04: Understand schedule and control gaps

Entry: Timeline, Projects, or RAID. Goal: see baseline/current variance, dependencies, missing plan data, and risks. Exit: exact source record. Recovery: absent dependency/meeting/evidence data is labeled unavailable or missing, never inferred.

## Information and content

- Information architecture: Today, Week, Timeline, Projects, RAID.
- Required content and source of truth: Monday for work; Outlook for meetings; command snapshot for control rules and gaps.
- Labels, instructions, and validation copy: Ready, At Risk, Behind, Unavailable; Pending, Confirmed, Conflict, Failed; Move task; Add task; Open in Monday.
- Character/content constraints: BPP voice, no em dash, no “leverage” as a verb, plain business language.

## Screens, components, and states

| Surface | Purpose | Default | Loading | Empty | Error/recovery | Success | Permission/disabled |
|---|---|---|---|---|---|---|---|
| Today | Daily command | Next checkpoint + actions | Static snapshot state | No open work message | Stale/unavailable source banner | Ready/At Risk/Behind assessment | Writes not present |
| Week | Weekly planning | Seven-day board | Pending card state | No work for day | Revert, retry, Open in Monday | Confirmed card | Move/Add disabled without local adapter, links remain |
| Timeline | Baseline/forecast | Gantt rows | N/A static | No dated work | Missing dependency state | Visible variance | Milestones not draggable |
| Projects | Full control record | Client panels | N/A static | Missing breakdown list | Exact control gaps | Complete coverage state | Replan unavailable in core release |
| RAID | Risks/issues/dependencies | Read-only table | N/A static | Truthful empty type | Source link fallback | Current record visible | Writes unavailable |

## Interaction and responsive behavior

- Input behavior and feedback: Changes preview impact first; source mutation occurs only after confirmation; Confirmed waits for read-back.
- Keyboard and focus behavior: Every drag action has Move buttons/dialog controls; visible focus; dialogs restore focus.
- Mobile, tablet, and desktop changes: 320/390 stack; 768 uses selective two-column layouts; 1024/1440 keep checkpoint and actions prominent. Gantt scrolls inside a labeled region only.
- Motion and reduced-motion behavior: Minimal state transitions; disable nonessential motion under `prefers-reduced-motion`.
- Performance or latency expectations visible to users: Pending begins immediately; long source calls retain attempted values and show recovery controls.

## Accessibility and inclusion

- Target standard or project requirement: WCAG 2.1 A/AA automated gate plus keyboard UAT.
- Semantic structure and announcements: One `h1`, landmarks, tables/regions labeled, mutation state announced through a live region.
- Contrast, touch target, zoom, and reflow requirements: 4.5:1 text, 44px touch targets, no page overflow at 320px, 200% zoom/reflow.
- Disabled-user evidence or untested risk: Automated and keyboard checks planned; no disabled-user research conducted.
- Language, literacy, device, connectivity, and assistive needs: Plain language, desktop and phone, truthful offline/unavailable states.

## Acceptance contract

| Criterion | User-observable result | Evidence at REVIEW/UAT | Human judgment required? |
|---|---|---|---|
| UX-01 | Today identifies next checkpoint, readiness, latest-safe date, threats, and the highest-value next action. | Rendered Today screenshot + DOM assertions | yes, Eli for hierarchy at production review |
| UX-02 | Week displays Monday-Sunday tasks, control markers, collisions, and extra-time work without page overflow. | Playwright at 320/390/768/1024/1440 | no |
| UX-03 | Move Task provides keyboard access, previews impact, and never shows Confirmed before matching read-back. | Unit tests + browser interaction | no |
| UX-04 | Add Task defaults to Eli, Not Started, selected date, and requires a parent deliverable. | Unit tests + contained adapter test | no |
| UX-05 | Missing Outlook, dependency, owner, date, evidence, or checkpoint data is visibly identified and never fabricated. | Fixture assertions + UAT | no |
| UX-06 | Timeline distinguishes baseline and forecast; milestones are not casually draggable. | DOM assertions + screenshot | no |
| UX-07 | Projects and RAID expose control gaps and exact source links. | Static validation + browser UAT | no |
| UX-08 | Public/static mode cannot mutate Monday and keeps usable Open in Monday fallbacks. | Built bundle inspection + API-unavailable UAT | no |
| UX-09 | All five views are keyboard reachable, WCAG A/AA clean at tested sizes, and status never relies on color alone. | axe + Playwright + manual keyboard pass | no |

## Four-risk status

| Risk | Status | Evidence | Remaining owner/action |
|---|---|---|---|
| Value | reduced | Repeated primary-user need and direction approval | Eli observes one real workday after local handoff. |
| Usability | reduced | Iterative prototype feedback | Eli judges hierarchy before production publish. |
| Feasibility | reduced | Existing Astro HQ and contained adapter plan | Codex proves build and read-back contract. |
| Viability | accepted | Monday remains source; no production identity | Daunte/Eli choose authenticated production approach later. |

## Constraints and dependencies

- Technical or operational constraints: Static Astro; no production runtime; existing Worker remains disabled.
- Data/content dependencies: Monday board `18406004595`, subitem board `18406004597`, current source timestamps.
- Legal, privacy, safety, or policy constraints: No tokens in browser/commits; no public writes; no permanent delete.
- Analytics and measurement requirements: Record source freshness; monitor critical journey and confirmed-write correctness.

## Open decisions and research debt

| Item | Blocking? | Owner | Due/evidence event |
|---|---|---|---|
| Live Outlook event ingestion | no | Eli/Daunte | Separate integration plan |
| Authenticated production write service | no for local, yes for production writes | Eli/Daunte | Before production mutation authority |
| Longitudinal usefulness | no | Eli | One real delivery week |

## Build-loop entry

- Release boundary requested: local-only release candidate.
- UX checkpoints during WRITE: Today hierarchy after first render; Week interaction/failure states after first browser pass.
- UX acceptance criteria to run at REVIEW/UAT: UX-01 through UX-09.
- Live behaviors and metrics to observe at MONITOR: all routes load, critical journey completes, no console/axe errors, no unconfirmed write labeled Confirmed.
- Conditions that return work to ux-loop: primary user cannot identify the next action, meeting/checkpoint model is misleading, or mobile planning is unusable.
