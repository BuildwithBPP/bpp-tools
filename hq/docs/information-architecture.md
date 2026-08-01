# BPP HQ information architecture

**Status:** Approved direction, orientation period active

**Decision date:** July 31, 2026

**Audience:** BPP owners, implementers, and future client-command-center teams

## Outcome

BPP HQ is an operating interface, not a second file system and not a replacement for every source platform. It should help an owner answer five questions quickly:

1. What needs attention now?
2. Are we on plan?
3. Where will growth come from?
4. Are clients and delivery on track?
5. Where is the authoritative answer?

The governing rule is:

> **HQ summarizes and routes. Authoritative systems store and execute.**

Monday.com continues to own project execution. HubSpot owns the sales pipeline. QuickBooks owns accounting truth. Governed workspace documents own plans, playbooks, and policies. HQ presents the useful operating view and links to those sources.

## Constraints and assumptions

- BPP has three owners and limited administrative capacity.
- The team primarily updates code and content with AI assistance.
- The current repository contains 71 HTML artifacts with mixed lifecycle states.
- Internal content must stay behind authentication.
- The interface must remain useful before every data connector is automated.
- BPP should not build a replacement CRM, project manager, accounting system, or document store.
- The architecture should remain reusable for a future client command-center service.

## Primary navigation

Keep six stable primary destinations:

```text
BPP HQ
|
+-- Today
+-- Performance
+-- Growth
+-- Delivery
+-- Company
|   +-- Business Plan
|   +-- Departments
|   +-- Roles and responsibilities
|   +-- Operating cadence
|   +-- Systems and data
|   +-- Technical landscape
|   `-- Governance and security
`-- Library
    +-- Current authoritative records
    +-- Templates and tools
    +-- Historical records
    `-- Search and filters
```

Six destinations are not the source of congestion. Congestion occurs when every document, department, dashboard, and system competes in the primary navigation. Detail routes remain nested, searchable, and contextually linked.

## Responsibilities by section

### Today

Answers: **What needs attention now?**

Include:

- current operating focus
- decisions needed
- material exceptions and risks
- owner commitments
- upcoming routines and meetings
- freshness or system warnings

Limit the opening view to three equal-priority actions and five operating blocks. Today should not become a full dashboard or company news feed.

### Performance

Answers: **Are we on plan, and why?**

Include:

- financial performance
- sales performance
- marketing performance
- delivery performance
- actual versus target
- trends and important drivers
- monthly and quarterly review history

Use one current dashboard with period controls and an archive. Do not create a separate navigation page for every month or quarter.

### Growth

Answers: **Where will growth come from?**

Include:

- ICP
- approved offers and pricing
- pipeline and funnel health
- seller workflows
- marketing and content status
- approved proof, proposals, and sales tools

Growth may summarize HubSpot and content systems. It does not become a second CRM or publishing platform.

### Delivery

Answers: **Are clients and delivery on track?**

Include:

- active engagement health
- milestones and deadlines
- capacity and delivery risks
- client journey and delivery standards
- quality tools and approved templates

Delivery may summarize Monday.com. Task execution stays in Monday.com. Client-confidential records require an approved client space or access boundary.

### Company

Answers: **How does BPP work?**

Include:

- BPP 2026-2028 Business Plan as the Plan of Record
- organization and department cockpits
- roles and responsibilities
- operating cadence and governance
- systems, data, AI workforce, and technical landscape
- security and change-management guidance

Strategic Plan v9 remains historical input and does not compete with the Business Plan.

### Library

Answers: **Where is the authoritative record?**

Include:

- universal search
- lifecycle, owner, confidentiality, department, and migration filters
- current authoritative records
- historical records
- approved templates and tools

Library is the complete knowledge and migration layer. It is not the expected daily starting point and does not duplicate source files.

## Department model

Departments live under **Company**, not in primary navigation. Each department cockpit uses the same contract:

1. Charter
2. Directly Responsible Individual
3. Collaborators
4. Top three priorities
5. Three to five KPIs
6. Recurring routines
7. Active initiatives
8. Authoritative playbooks and tools
9. Dependencies
10. Recent decisions

Department pages link to Performance, Growth, Delivery, Company, and Library. They do not copy package prices, targets, policies, or operational records.

## Progressive-disclosure rules

Every route should move from decision to detail:

```text
Signal
  -> short explanation
      -> current action or decision
          -> authoritative source
              -> historical detail when requested
```

Guardrails:

- no page opens with more than three equal-priority actions
- summary pages show three to five KPIs, not every available metric
- long tables and archives begin behind filters or focused links
- technical build detail stays under Company or Library
- historical pages never appear as current recommendations
- one fact has one governing source and may be referenced elsewhere
- every operational fact shows owner, source, and freshness

## Content disposition

The 71-artifact catalog is an audit layer. It is not the target navigation.

### Carry forward

Keep a working source reachable until a native HQ route preserves its useful workflow, evidence, and links.

### Historical

Keep for evidence and learning, but remove from routine navigation. Historical records remain searchable and visibly dated.

### Retire after cutover

Retire only after the replacement is live, linked, tested, and approved. The initial candidates are old section indexes, duplicate department and system directories, legacy Library and Reviews pages, old quarterly shells, and generated build templates.

Nothing is deleted solely because the catalog recommends retirement.

## What to add

Prioritize only capabilities that shorten a recurring workflow:

1. Universal search
2. Small attention and decision queue on Today
3. Consistent owner, source, and freshness metadata
4. Uniform department cockpit contracts
5. Safe scheduled and owner-triggered refresh history
6. Favorites or recent items only after real usage demonstrates the need

## Live data and BI boundary

Connected source data moves through four distinct steps:

```text
System of record
  -> preserved raw snapshot
      -> validated business summary
          -> dashboard metric, table, or decision signal
```

The raw snapshot is evidence and recovery history. It is not the dashboard contract. Each source needs a small transformation that applies documented business rules before a number reaches an operating page.

For HubSpot, the first governed summary provides:

- open pipeline amount and opportunity count
- probability-weighted pipeline
- hot opportunities, defined as open stages at 60% probability or higher
- open stage counts, values, and probabilities
- closed-won activity for the snapshot year
- a readable open-deal preview
- snapshot ID, record count, and capture time

HubSpot closed-won activity must never be labeled booked revenue. QuickBooks remains the accounting authority. Growth and Performance use a static fallback only when the protected summary cannot load, and they show the snapshot capture time when live values replace that fallback.

The browser receives a derived summary instead of becoming the transformation engine. Raw history stays available to approved owners for inspection and recovery, but routine dashboards request only the smallest useful operating shape.

## What not to build now

- internal social feed
- chatbot on every page
- mega-menu
- duplicate CRM
- duplicate project tracker
- duplicate accounting interface
- page for every document
- complex role-based personalization
- speculative widgets without a recurring owner routine
- write actions without identity, validation, rate limits, and audit history

## System boundaries and data flow

```text
QuickBooks -----+
HubSpot --------+
Monday.com -----+                      +--> Today
Metricool ------+--> validated snapshots --> Performance
GitHub ---------+       and registries +--> Growth
BPP Workspace --+                      +--> Delivery
                                        +--> Company
                                        `--> Library

HQ actions -----------------------------> authoritative source system
```

The refresh layer may preserve raw history and a last-known-good snapshot. It does not make HQ the accounting, CRM, or project-execution database.

The staging request path is:

```text
Protected Pages site
  -> same-origin /api/* Pages Function
  -> private REFRESH_SERVICE binding
  -> scheduled refresh Worker
  -> staging D1 metadata + encrypted credentials
  -> staging R2 raw snapshot history
```

The Pages Function exposes only the governed refresh-status, manual-refresh, latest-snapshot, and snapshot-history routes. The Worker verifies the Cloudflare Access assertion and exact owner allowlist, checks the request origin for manual refreshes, and returns 403 when called anonymously. This keeps the static HQ simple without moving provider credentials or source-system writes into the browser.

## Orientation period

Pause structural expansion while the owners learn the interface.

Recommended review sequence:

1. Today and Performance: Can an owner understand the business quickly?
2. Growth and Delivery: Can an owner find the next commercial or client action?
3. Company: Can an owner find the plan, ownership model, routine, and system guidance?
4. Library: Can an owner find a known record and classify unclear routing?

During this period, record friction rather than immediately redesigning around each comment. A change should be prioritized when it blocks a recurring routine, causes a wrong decision, hides a current answer, or repeats across owners.

## Adoption anchors

Each operating section needs a recurring trigger:

| Section | Trigger | Expected use |
|---|---|---|
| Today | owner meeting and start of workday | priorities, decisions, risks |
| Performance | monthly and quarterly review | results, drivers, targets |
| Growth | sales review | pipeline, offers, next actions |
| Delivery | delivery and capacity review | client health, milestones, blockers |
| Company | planning and governance decisions | plan, ownership, systems |
| Library | answer-finding and content review | authoritative source and history |

If a page has no recurring trigger, named owner, or decision purpose, it should not be promoted into primary navigation.

## Trade-offs

- Six stable sections require discipline inside each section, but they provide clearer mental models than department-first navigation.
- A complete Library can feel dense, but keeping it separate prevents the main interface from becoming a 71-link directory.
- Summaries improve speed but can hide nuance, so every signal must link to its source.
- Static output stays simple and reliable; a narrow Pages Function and private service binding provide live refreshes without turning HQ into a general application server.
- One reusable architecture helps future client delivery, but BPP should prove adoption internally before adding multi-client software complexity.

## Revisit as the system grows

Reconsider the architecture only when evidence supports it:

- add favorites when repeated navigation patterns are visible
- add role-based views when three-owner needs materially diverge
- add more connectors after one source works end to end in staging
- consider client tenancy after a repeatable implementation has been delivered successfully
- reconsider primary navigation only when real usage shows a section is consistently ignored or misunderstood

## Acceptance tests

- an owner finds the current answer within three clicks
- no historical record looks current
- no main route opens with more than three equal-priority actions
- every operational fact exposes owner, source, and freshness
- department pages link to governing content instead of copying it
- task, CRM, accounting, and document execution remain in their authoritative systems
- all preview and production URLs require approved authentication
