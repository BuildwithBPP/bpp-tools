# BPP HQ proof-of-concept implementation report

**Status:** LOCAL RELEASE CANDIDATE

**Implementation date:** August 27, 2026

**Branch:** `eli/client-delivery-command-center`

**Application boundary:** `hq/`

## Delivered routes

| Route | Purpose | Delivery level |
|---|---|---|
| `/` | Today leadership brief | Detailed first pass |
| `/performance/` | Executive scorecard and Monthly Review view | Structured first pass |
| `/growth/` | Pipeline, approved offers, and commercial priorities | Structured first pass |
| `/delivery/` | Eli's checkpoint-first delivery command view | Detailed operating view |
| `/delivery/week/` | Current week tasks, movable cards, add-task flow, and collision state | Detailed operating view |
| `/delivery/timeline/` | Baseline, forecast, today marker, and checkpoints | Detailed operating view |
| `/delivery/projects/` | Legacy B and HALO deliverables, checkpoints, and control gaps | Detailed operating view |
| `/delivery/raid/` | Risks, assumptions, issues, dependencies, responses, and evidence | Detailed operating view |
| `/company/` | Plan of Record, strategy, targets, ownership cockpits, cadence, and systems | Detailed first pass |
| `/library/` | Registry-driven search, filters, lifecycle, ownership, and source directory | Structured first pass |

## Main files

- `src/layouts/HQLayout.astro`: reusable desktop and mobile shell
- `src/components/SideNav.astro`: six-route desktop and mobile navigation
- `src/components/UtilityBar.astro`: page state, search, source snapshot, and local screen-share control
- `src/components/StatusBadge.astro`: lifecycle and operating state
- `src/components/Metric.astro`: metric with required timeframe and source
- `src/components/ActionLink.astro`: working internal route and anchor actions
- `src/components/SourceMeta.astro`: owner, lifecycle, source, last verified, and freshness state
- `src/components/DocumentHeader.astro`: restrained consulting document treatment
- `src/components/Section.astro`: reusable content section
- `src/components/DataState.astro`: stale, unavailable, empty, and notice states
- `src/data/registries.ts`: build-time Zod validation of the read-only shared registries
- `src/data/snapshot.ts`: validation of representative performance and delivery snapshots
- `src/styles/global.css`: BPP tokens, shell, page patterns, focus, responsive rules, screen-share treatment, and print rules
- `public/brand/bpp-b-mark.png`: local copy of the canonical transparent BPP mark
- `scripts/validate.mjs`: route, schema, semantic structure, brand wording, link, and placeholder validation
- `scripts/capture.mjs`: responsive browser, horizontal overflow, navigation, and WCAG A/AA checks

## Client delivery command center

- Uses a Zod-validated snapshot of Monday board `18406004595` limited to Legacy B. Studio and HALO Pathways.
- Calculates checkpoint readiness, latest-safe dates, current KPIs, pull-forward ranking, workload collisions, and explicit control gaps without inventing owners, meetings, dependencies, or evidence.
- Keeps baseline dates fixed at the approved Aug 26 snapshot and renders current forecast separately.
- Provides mouse drag and keyboard-equivalent Move controls. The confirmation preview includes old date, new date, latest-safe date, checkpoint impact, and the source Monday link.
- Add Task defaults to Eli Fisher, Not Started, and today's date, requires an approved parent deliverable, and allows the owner name to change.
- Includes a loopback-only Monday adapter that validates board/group membership, resolves live columns and owners, uses version checks, performs create/date/archive mutations, and returns Confirmed only after exact read-back.
- Includes a deterministic snapshot refresh pipeline that preserves baselines and checkpoint mappings while refreshing Monday forecast state.

## Review fix round 1

- The utility bar now renders the page source, verification date, freshness threshold, and derived current, stale, historical, or unavailable state.
- Performance, Growth, and Company utility metadata comes directly from their matching shared page registry records.
- Mobile layouts retain visible source and freshness context instead of hiding the verification signal.
- Today visibly demonstrates the stale state because its current-week operating brief was last verified July 13 against a seven-day threshold.
- HR & People Ops is Parked. Daunte is researching the function, and no ratified DRI is assigned.
- Static validation now fails if a route omits visible utility source/freshness metadata, lacks a derived stale example, drifts from applicable page registry metadata, or assigns HR ownership that has not been ratified.

## Visual refinement

- Removed the graph-paper texture and moved the interface to the canonical `#FCFCFC` canvas.
- Reworked the shell as a quieter modern product navigation with the canonical BPP B mark and a restrained gold selected line.
- Bundled Montserrat for interface titles, Poppins for body and data, and Merriweather only for major Company document headings. No runtime font request leaves the application.
- Reduced repeated metadata boxes to compact source and freshness footnotes while keeping the same information visible.
- Changed action cards, department tiles, panels, and document containers into lighter divided surfaces with less radius, border weight, and status-chip noise.
- Increased section spacing and editorial rhythm across Today and Company.
- Preserved semantic structure, visible focus, responsive behavior, print rules, source/timeframe labels, and WCAG A/AA results.

## Registry boundary

The application imports these existing source files without editing them:

- `../data/registry/pages.json`
- `../data/registry/offers.json`
- `../data/registry/targets.json`

The Astro build fails when required fields are missing, AI Jumpstart terms drift from $699 standard and $599 launch price after the $100 discount, plan authority becomes ambiguous, or target records do not match the expected contract.

## Verification evidence

### August 27 delivery release candidate

- `npm test`: 16 tests passed; Astro Check returned 0 errors, 0 warnings, and 0 hints; 10 static routes built and validated.
- `npm run delivery:check`: 2 projects, 41 deliverables, and 36 tasks passed the committed snapshot schema.
- `npm audit` and `npm audit --omit=dev`: 0 vulnerabilities after the lockfile remediation.
- Browser QA: all 10 routes passed at 1440, 1024, 768, 390, and 320 pixels with no page overflow or console errors.
- Accessibility: WCAG 2 A/AA and WCAG 2.1 A/AA automated checks passed at 1440, 390, and 320 pixels.
- Delivery journey: Add Task defaults, Cancel, Move, latest-safe conflict warning, checkpoint markers, source metadata, and read-only public fallback passed.

- `npm run build`: Astro 7.1.6 static build passed. Astro Check reported 0 errors, 0 warnings, and 0 hints across 22 files. Six HTML routes were generated.
- `npm run validate`: passed for six routes and six registry records. Utility source/freshness metadata, HR ownership truth, the canonical local BPP mark, and the clean canvas invariant are enforced. All internal routes and anchors resolve. No placeholder links, empty links, `javascript:` links, em dashes, or prohibited brand wording were found.
- Browser QA: passed on all six routes at 1440, 1024, 768, and 390 pixels. No page-level horizontal overflow was detected.
- Accessibility: automated WCAG 2 A/AA and WCAG 2.1 A/AA checks passed on all six routes at 1440 and 390 pixels.
- Metrics: validation confirms every rendered metric includes a source and timeframe.
- Dependency audit: `npm audit --omit=dev` reports 0 vulnerabilities after upgrading to Astro 7.1.6 and updating the lockfile.
- Screenshots:
  - `artifacts/today-desktop.png`
  - `artifacts/today-mobile.png`
  - `artifacts/company-desktop.png`
  - `artifacts/company-mobile.png`

## Known limitations and concerns

1. This is a local-only release candidate. Push, merge, public deployment, hosted authentication, and hosted Monday writes were not authorized or performed.
2. The committed delivery data is an Aug 26 Monday snapshot. `npm run delivery:refresh` exists, but the live refresh query has not been smoke-tested with a real token in this release.
3. The loopback adapter passed fake upstream tests only. A live create, move, read-back, and archive sequence still requires explicit approval because it changes the shared Monday board.
4. Outlook event IDs are unavailable. Meeting control gaps are visible; the interface does not claim calendar sync.
5. Monday dependency mappings and completion evidence are sparse. The interface exposes those gaps instead of inferring false dependencies or approvals.
6. Authentication and Cloudflare Access remain deployment boundaries. Screen-share mode is a visual aid, not security.

## Owner decisions required

1. Approve or defer the exact live Monday smoke test record and archive cleanup.
2. Choose whether to keep the feature branch, merge locally, or authorize a pull request.
3. Define the hosted authentication and server-side write boundary before any public deployment with client delivery data.
4. Decide whether Outlook event mapping is a next release or remains a visible manual control gap.
