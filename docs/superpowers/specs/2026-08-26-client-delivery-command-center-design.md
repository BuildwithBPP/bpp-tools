# Client Delivery Command Center Design

**Date:** 2026-08-26

**Status:** Approved by Eli on 2026-08-26

**Initial user:** Eli Fisher

**Initial projects:** Legacy B. Studio and HALO Pathways website engagements

## 1. Purpose

Build a genuinely usable client-delivery control surface inside the next BPP Tools Hub. It must answer four questions immediately:

1. What should I do now?
2. What client checkpoint am I protecting?
3. What is threatening that checkpoint?
4. If something slips, what changes next?

The command center is not a replacement for Monday or Outlook. Monday remains the project-work source of truth. Outlook remains the meeting source of truth. The Hub becomes the operating interface that connects tasks, deliverables, meetings, review buffers, dependencies, risks, evidence, and schedule impact.

## 2. Challenge and decision

A standalone dashboard would create another passive surface. A second independent task system would create reconciliation work and eventually drift from Monday.

The approved direction is:

- Use Monday deliverables and subitems as the shared work records.
- Use Outlook events as the meeting records.
- Add the planning and control intelligence those tools do not provide in BPP's current licenses.
- Support direct Monday task management when the secure write bridge is available.
- Fall back to opening the exact Monday item when a write is unavailable or fails.

## 3. Scope

### Included in the first release

- Website-delivery blueprint for Legacy B and HALO.
- Today, Week, Timeline, Projects, and RAID views.
- Meeting-centered checkpoint readiness.
- Weekly work derived from deliverables and checkpoints.
- Monday task creation, editing, ownership, status, priority, due-date, archive, and delete controls.
- Outlook meeting ingestion and explicit meeting-to-client mapping.
- Baseline-versus-forecast schedule control.
- Latest-safe dates, review buffers, and downstream-impact warnings.
- Scope coverage, completion evidence, acceptance criteria, client-owned inputs, and plan-completeness checks.
- Visible Monday synchronization, confirmed read-back, conflict handling, and audit history.
- Eli as the default owner for newly created tasks.

### Deferred

- Templates for non-website packages.
- Automated resource-capacity percentages. The first release can detect workload collisions but must not invent capacity without effort and availability data.
- Outlook calendar editing. Meeting edits open Outlook.
- Production exposure of unauthenticated write endpoints.
- Executive portfolio reporting beyond the delivery KPIs defined below.

## 4. Operating model

### 4.1 Website blueprint

The blueprint defines the expected project structure before kickoff:

- contracted deliverables;
- default work breakdown by deliverable;
- milestone and acceptance gates;
- expected meetings;
- required meeting inputs and outputs;
- client and BPP review buffers;
- typical dependencies;
- evidence required for completion;
- default owner role, priority, and relative timing.

The blueprint is a baseline, not an inflexible clone. A project can add, remove, or alter work through the controlled planning and change workflow.

### 4.2 Project lifecycle

1. Select the website blueprint.
2. Confirm scope, deliverables, rough dates, and expected meetings before kickoff.
3. Reconcile the baseline after kickoff using the facts agreed with the client.
4. Generate or validate weekly tasks beneath each deliverable.
5. Work backward from each Outlook checkpoint to calculate review and send-by dates.
6. Detect missing work, contradictory dates, dependency risk, and scope gaps.
7. Reforecast when reality changes without silently replacing the approved baseline.

### 4.3 Work hierarchy

- **Project:** one client engagement.
- **Deliverable:** a Monday parent item.
- **Task/action item:** a Monday subitem beneath a deliverable.
- **Checkpoint:** a control record linked to an Outlook meeting, required deliverables, tasks, decisions, and evidence.
- **RAID record:** a risk, assumption, issue, or dependency linked to affected work and checkpoints.

New Hub tasks must become Monday subitems. The Hub must infer the parent deliverable from the location where Add Task is invoked and require confirmation when the association is ambiguous. No Hub-only task store is permitted.

## 5. Information architecture

### 5.1 Today

The default landing page is checkpoint-first and serves as the daily control view.

It shows:

- next protected checkpoint;
- readiness state and completion coverage;
- approved baseline and current forecast;
- latest-safe dates;
- work ordered by urgency and downstream impact;
- client-owned inputs;
- threats and affected downstream work;
- scope and evidence gaps;
- highest-value safe task to pull forward when extra time is available;
- Monday and Outlook synchronization state.

### 5.2 Week

The Week view uses Monday through Sunday because BPP work occurs on nights and weekends.

It shows:

- tasks on their due dates;
- Outlook meetings;
- send-by and review-buffer markers;
- client-owned inputs;
- risk markers;
- daily completion state;
- weekly control gaps;
- a ranked "I have extra time" queue;
- workload collisions between Legacy B and HALO;
- per-card Monday synchronization state.

### 5.3 Timeline

The Timeline view provides the project and portfolio Gantt.

It shows:

- approved baseline and current forecast;
- deliverable and task bars;
- meetings and acceptance milestones;
- dependency links;
- today's position;
- overdue and slipped work;
- filters for person, project, status, and phase;
- schedule impact when dates change.

### 5.4 Projects

The Projects view provides the full control record for each engagement:

- scope baseline;
- deliverables and task breakdown;
- checkpoint sequence;
- acceptance criteria;
- evidence links;
- plan-completeness score;
- scope changes;
- baseline and reforecast history;
- decisions and approvals.

### 5.5 RAID

The RAID view supports risks, assumptions, issues, and dependencies with:

- type;
- title and description;
- project and linked work;
- owner;
- probability and impact for risks;
- severity for issues;
- response or resolution;
- due or review date;
- status;
- affected checkpoint and downstream impact;
- evidence or source link.

## 6. Checkpoint-readiness model

Every checkpoint contains:

- Outlook event identity, time, attendees, and join link;
- client and project;
- meeting purpose;
- required deliverables;
- required BPP and client inputs;
- send-by date;
- internal and client review buffers;
- decision asks;
- expected outputs;
- acceptance criteria;
- completion evidence;
- linked risks, issues, and dependencies.

### Readiness states

- **Ready:** all critical requirements are complete, required evidence exists, and review buffers are intact.
- **At risk:** recovery remains possible, but an input, task, review buffer, or noncritical requirement is threatened.
- **Behind:** a latest-safe date has passed, a critical prerequisite is missing or blocked, or a scheduling contradiction makes the checkpoint unachievable as planned.

The displayed completion percentage is the completed-required-items count divided by total required items. It is supporting context only. The Ready, At Risk, or Behind state is determined by the explicit control rules above, not an opaque weighted score.

### Latest-safe dates

- Task due dates remain actual project dates.
- Client and internal review buffers use configurable business-day rules, defaulting to Monday through Friday.
- The system displays the rule used for every calculated send-by or latest-safe date.
- A user can override the calculated date only through the Replan workflow, with a reason recorded.

## 7. Scope and change control

Each scope item is classified as:

- contracted;
- clarified within scope;
- requested addition;
- approved change;
- rejected or deferred as out of scope.

The approved baseline is immutable history. Replanning creates a new forecast and records:

- changed dates or work;
- reason;
- owner;
- date of change;
- affected tasks, checkpoints, invoices, and deliverables;
- whether client approval is required or received.

Drag-and-drop must never silently rebaseline a deliverable or milestone.

## 8. Interaction contract

### Task movement

- Task cards can move between days.
- Dropping a card previews the due-date change and any checkpoint or dependency impact.
- Moving past the latest-safe date requires explicit confirmation.
- The Hub writes the due date to Monday, reads the item back, and only then shows the confirmed state.
- A failed write reverts the card and offers Open in Monday.

### Task creation

Add Task is available from a day, checkpoint, and deliverable.

Defaults:

- owner: Eli Fisher;
- status: Not Started;
- due date: selected day when invoked from the Week view;
- client and deliverable: inferred from context;
- priority: inherited from the deliverable when available.

The user can change the owner and other fields before or after saving. Creating the task writes a Monday subitem and requires read-back confirmation.

### Meetings

- Outlook owns meeting time, attendees, and join links.
- Meeting cards are not draggable in the Hub.
- Edit Meeting opens the Outlook event.
- Automatic matching can suggest a client based on title and attendees, but the first match requires confirmation and is then stored by Outlook event ID.

### Removal

- Archive/cancel is the normal removal action and is recoverable.
- Permanent delete requires a second confirmation and an audit record.
- Permanent delete remains disabled in any environment where user identity cannot be enforced.

## 9. KPIs

The first release includes only actionable delivery KPIs:

- next-checkpoint readiness;
- on-time checkpoint rate;
- overdue tasks;
- blocked tasks and dependencies;
- work due in the next seven days;
- client inputs awaiting response;
- baseline-versus-forecast variance;
- deliverables without task breakdowns;
- tasks missing owners, dates, or checkpoint links;
- workload collisions by owner and date range.

Workload collision means overlapping critical work assigned to the same owner. It must not be labeled utilization or capacity percentage until effort estimates and availability are available.

## 10. Data and architecture

### Sources of truth

- **Monday:** projects, deliverables, tasks, owners, status, priority, dates, dependencies, and item URLs.
- **Outlook:** meeting identity, time, attendees, and meeting links.
- **Command-center control store:** blueprints, checkpoint rules, meeting mappings, RAID records, scope changes, evidence links, preferences, and audit history.

### Application boundary

- The command center lives in the next BPP Tools Hub codebase.
- A Cloudflare Worker performs Monday and Outlook API calls.
- Cloudflare D1 stores blueprints, checkpoint rules, meeting mappings, RAID records, scope changes, evidence links, preferences, and audit history.
- API credentials never enter committed browser code.
- The initial contained build has no separate in-app sign-in.
- Authentication and production access control are an accepted deferred risk.
- Until access control exists, write endpoints may run only in a contained local or preview environment. Public production pages fall back to Monday deep links.

### Synchronization

1. Load normalized Monday and Outlook data.
2. Record source timestamps and item versions.
3. Render the Hub state.
4. Submit a user change with the expected source version.
5. Reject stale changes and refresh if Monday changed after load.
6. Read the target record back after mutation.
7. Show Confirmed only when the read-back matches.
8. Append an audit event.

## 11. Error handling

- **Monday unavailable:** show cached read-only state with a stale-data banner and deep links.
- **Outlook unavailable:** retain project work, show meetings unavailable, and never invent meeting times.
- **Write failure:** revert the local action, preserve the user's attempted values, and offer Retry or Open in Monday.
- **Conflict:** show the current Monday value beside the attempted value and require the user to refresh or deliberately reapply.
- **Unmatched meeting:** place it in Needs Mapping without assigning a client automatically.
- **Missing required data:** identify the exact missing owner, date, task, dependency, evidence, or meeting link.
- **Partial project data:** reduce confidence and show the plan-completeness gaps instead of presenting the project as healthy.

## 12. Audit and privacy

Audit events contain:

- actor profile;
- timestamp;
- action;
- source record ID;
- prior and new values;
- confirmation result;
- reason when required;
- fallback or failure details.

The contained no-sign-in build defaults the active profile to Eli. That profile supports workflow defaults but is not security-grade identity. Destructive production actions remain disabled until identity can be enforced.

## 13. Verification

### Functional

- Normalize all Legacy B and HALO deliverables and subitems.
- Confirm blueprint coverage without silently adding unapproved scope.
- Create a task, default the owner to Eli, and verify the Monday subitem through a separate read.
- Change status, priority, owner, and due date; verify each through read-back.
- Drag a task across days and verify schedule-impact warnings and Monday state.
- Exercise archive behavior and confirm permanent delete remains disabled without enforceable identity.
- Match, unmatch, and remap an Outlook event.
- Test baseline preservation and reforecast history.
- Test dependency and latest-safe-date calculations.
- Test stale-source conflicts and failed writes.

### Visual and accessibility

- Verify Today, Week, Timeline, Projects, and RAID at 320, 390, 768, 1024, and 1440 pixels.
- Confirm no horizontal page overflow outside intentional Gantt scrolling.
- Run DOM-wide WCAG contrast checks in every supported theme.
- Verify keyboard navigation, visible focus, drag alternatives, and 44-pixel touch targets.
- Inspect each view in a real browser and confirm no console errors.

### Outcome verification

The release is usable only when Eli can open the Hub and, without consulting a separate planning document:

- identify today's most important task;
- see the week plan and next checkpoint;
- find what must be sent before a meeting;
- understand what is threatening the schedule;
- pull forward the correct next task;
- make a task change and see Monday confirm it.

## 14. Delivery sequence

1. Normalize current Monday data and implement plan-completeness diagnostics for Legacy B and HALO.
2. Implement the website blueprint and checkpoint-control model.
3. Build Today and Week.
4. Build Timeline, Projects, and RAID.
5. Add contained Monday write-through with read-back and fallback.
6. Add Outlook meeting ingestion and mapping.
7. Run functional, responsive, accessibility, and real-browser verification.
8. Add production access control before exposing write endpoints publicly.

## 15. Approved design decisions

- Checkpoint-first Today view is the default landing page.
- Week, Timeline, Projects, and RAID are secondary views.
- The initial scope is Eli's current Legacy B and HALO website projects.
- Monday remains the work source of truth.
- Outlook remains the meeting source of truth.
- Full task management is the target, with Monday deep-link fallback.
- New tasks default to Eli and are created as Monday subitems.
- Task cards are draggable; meetings are not.
- Deliverable and milestone changes use Replan.
- Archive and permanent delete both exist, with permanent delete gated.
- Separate sign-in is deferred for the contained build.
