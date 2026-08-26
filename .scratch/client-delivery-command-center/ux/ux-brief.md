# UX Brief: Client Delivery Command Center

**Owner:** Eli Fisher  
**Decision owner:** Eli Fisher  
**Depth:** Fast  
**Status:** HANDED_OFF  
**Updated:** 2026-08-26

## Station decisions

| Station | Decision | Date | Evidence or reason |
|---|---|---|---|
| Challenge | GO | 2026-08-26 | A static dashboard and a second task system were rejected because both drift from Monday. |
| Discover | GO | 2026-08-26 | Eli described his current Todoist, Outlook, Monday, pre-meeting, and extra-time workflows in detail. |
| Define | GO | 2026-08-26 | The approved problem is daily confidence and checkpoint protection, not generic reporting. |
| Diverge | GO | 2026-08-26 | Eli selected Today as the landing page with Week and Timeline as secondary views, then added Projects and RAID. |
| Prototype | GO | 2026-08-26 | A visual companion was reviewed and refined around week cards, movement, Add Task, owner defaults, and Monday sync. |
| Validate | GO | 2026-08-26 | The primary user approved the UI direction and asked to build it. Formal longitudinal usability remains untested. |

## Challenge

- Initial request: One place to understand today's work, upcoming meetings, required pre-meeting deliverables, schedule alignment, and delivery threats.
- Why now: Legacy B. Studio and HALO Pathways are concurrent website engagements with different structures and upcoming checkpoints.
- Who is affected: Eli first. Team filtering is a future refinement.
- Desired behavior or outcome: Eli opens one surface, sees the checkpoint he is protecting, knows what to do next, and can safely keep Monday current.
- Case for doing nothing: Continue using Todoist, Outlook, and Monday independently.
- Smaller or non-software alternative: A static weekly briefing generated from Monday.
- Wrong-call conditions: The Hub becomes another task database, hides source freshness, invents meetings, or permits unsafe public writes.
- Boundaries and stop conditions: Monday owns work, Outlook owns meetings, no production write endpoint without enforceable identity.

## Evidence ledger

| ID | Claim | State | Source | Confidence | Decision affected |
|---|---|---|---|---|---|
| E-01 | Eli lacks confidence that his dated to-do list fully reflects the delivery plan. | reported | User discussion summarized in approved design spec | high | Build a checkpoint-first operating view. |
| E-02 | Monday tracks milestones better than the detailed action items that complete them. | reported | User discussion summarized in approved design spec | high | Normalize deliverables and subitems. |
| E-03 | Eli needs work organized around meetings, send-by dates, and review buffers. | reported | Approved design, sections 1, 4, and 6 | high | Make checkpoint readiness the primary model. |
| E-04 | Eli wants a Monday-to-Sunday week, movable tasks, Add Task, and Eli as default owner. | reported | Approved design, sections 5 and 8 | high | Build Week interactions and defaults. |
| E-05 | Monday mutations can report success while writing defaults or nulls. | observed | Prior verified Monday operations and approved synchronization contract | high | Require exact read-back before Confirmed. |
| E-06 | The current public Hub has no enforceable user identity. | observed | Repo Worker containment note and HQ architecture | high | Keep production writes disabled. |
| E-07 | The primary user approved the interface direction. | reported | User statement “looks good, lets build it” | high | Proceed to engineering handoff. |

## Discover

- Research questions: What must be visible before work starts? What records already exist? Which interactions must update Monday? What failure states would destroy trust?
- Existing evidence reviewed: Approved design, implementation plan, current HQ proof-of-concept, Monday governance, live Legacy B/HALO board findings, Worker containment note.
- Participants or evidence sources: Eli as primary operator; current repository and Monday records.
- Current journey and workarounds: Check Todoist for dated actions, Outlook for meetings, Monday for milestones, mentally reconcile what must be ready before each meeting.
- Frequency, severity, and baseline: Daily and pre-meeting. Baseline confidence is low enough that Eli requested a second operating view.
- Inclusion and accessibility needs: Keyboard-equivalent movement, visible focus, non-color status labels, responsive 320px through 1440px, WCAG A/AA automated checks.
- Constraints and adjacent services: Static Astro/GitHub Pages, Monday board, Outlook, no current Hub identity, nights/weekends work pattern.
- Limitations and unknowns: No formal task-completion timing baseline, no real longitudinal use, Outlook integration unavailable in this release.

## Define

- Primary user or actor: Eli, BPP Client Delivery and Design DRI.
- Job and context: Run two concurrent website projects proactively during limited nights/weekends time.
- Problem statement: Eli cannot see task, deliverable, meeting, buffer, dependency, and risk relationships in one trustworthy place, so he cannot quickly judge what protects the next client checkpoint.
- Moment that matters: Opening BPP to decide what to do today or what to pull forward with extra time.
- Desired user outcome: Identify the next safe, high-value action without mentally reconciling three tools.
- Desired business outcome: Fewer missed checkpoint prerequisites, earlier risk detection, and a current Monday board.
- Baseline and measurement plan: Baseline is qualitative confidence. First-release metric is completion of the critical journey with zero unknown task destinations and zero unconfirmed writes.
- Prioritized opportunity: How might the Hub turn existing Monday work into a checkpoint-centered daily command surface without becoming another source of truth?
- Constraints and dependencies: Monday data completeness, static hosting, local-only write adapter, missing Outlook connector.
- Non-goals: Generic team capacity percentages, new package templates, public writes, permanent deletion.
- Open questions: How often Eli uses the extra-time queue and which readiness warnings lead to action. Observe after real use.

### Four-risk register

| Risk | Key assumption | Evidence | Status | Next test |
|---|---|---|---|---|
| Value | One combined view reduces Eli's planning uncertainty. | Repeated user articulation and approval | reduced | Use the local release candidate during a real workday. |
| Usability | Checkpoint-first hierarchy is faster than a raw task list. | Prototype feedback selected Today plus secondary views | reduced | UAT on Today and Week at desktop/mobile. |
| Feasibility | Static Astro can render the model and use a contained adapter. | Existing HQ build and documented loopback architecture | reduced | Build, browser QA, fake and controlled live read-back. |
| Viability | BPP can keep the snapshot current enough to remain trusted. | Monday is authoritative; refresh process planned | open | Run refresh/read-back and measure staleness. |

## Diverge

| Direction | How it works | Evidence fit | Largest risk | Cheapest test | Decision |
|---|---|---|---|---|---|
| A | Static generated weekly brief | Cheap and useful for orientation | Passive and stale | Render one week | reject |
| B | Hub becomes a second PM database | Full flexibility | Reconciliation and drift | Data-model prototype | reject |
| C | Hub controls Monday/Outlook records through a planning layer | Matches source-of-truth needs | Integration/security | Contained command center | select |

- Selected direction and why: Direction C connects existing systems and adds checkpoint logic without duplicating work.
- Rejected directions and why: A cannot stay actionable; B creates the exact maintenance burden Eli wants to avoid.

## Prototype

- Question being tested: Can Eli understand today, week, and schedule alignment while managing Monday tasks from one surface?
- Prototype and fidelity: High-fidelity visual companion plus approved written interaction contract.
- Critical journey: Open Today, identify next checkpoint, inspect threats, open Week, move or add a task, confirm Monday state.
- States included: Current, stale, unavailable, pending, confirmed, conflict, failed, empty, blocked.
- Accessibility/content fidelity: Real BPP palette and named client examples; keyboard and responsive requirements specified.
- What is intentionally absent: Production auth, Outlook write behavior, utilization percentages.

## Validate

- Participants and rationale: Eli, the initial and primary user.
- Tasks: Judge Today as landing page; assess Week usefulness; specify movement, task creation, ownership, and sync behavior.
- Predeclared threshold: Direction approved with no unresolved blocker that forces engineering to invent user behavior.

| Observation | Participant evidence | Interpretation | Design response | Retest needed |
|---|---|---|---|---|
| Daily alone was insufficient. | Eli requested a week view for extra available hours. | Planning needs today plus pull-forward context. | Add Monday-to-Sunday Week and extra-time queue. | no |
| Cards must update Monday. | Eli asked whether movement and Add Task sync. | Trust depends on source mutation, not visual rearrangement. | Add confirmation, read-back, revert, and deep-link fallback. | yes, in UAT |
| New tasks should default to Eli. | Eli explicitly requested default ownership with edit option. | Reduce repetitive setup without blocking reassignment. | Default active profile to Eli and resolve live Monday owner. | yes, in UAT |
| UI direction is acceptable. | Eli said it looks good and approved the build. | Engineering may proceed. | Mark handoff READY with residual live-use risk. | no |

- Result: GO
- Residual risk: The workflow is prototype-reviewed but not yet observed during a real delivery week.
- Next evidence event: Eli uses the local release candidate for a real daily planning session.

## Decision history

- 2026-08-26: Today selected as landing page; Week and Timeline retained as secondary views.
- 2026-08-26: Projects and RAID included for control depth.
- 2026-08-26: Sign-in removed for now; production write risk explicitly deferred.
- 2026-08-26: Local-only write adapter chosen after repository security containment was confirmed.
