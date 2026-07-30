# BPP HQ proof-of-concept implementation report

**Status:** DONE_WITH_CONCERNS

**Implementation date:** July 29, 2026

**Branch:** `feat/bpp-hq-poc`

**Application boundary:** `hq/`

## Delivered routes

| Route | Purpose | Delivery level |
|---|---|---|
| `/` | Today leadership brief | Detailed first pass |
| `/performance/` | Executive scorecard and Monthly Review view | Structured first pass |
| `/growth/` | Pipeline, approved offers, and commercial priorities | Structured first pass |
| `/delivery/` | Engagement health, milestones, capacity state, and quality tools | Structured first pass |
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
- `scripts/validate.mjs`: route, schema, semantic structure, brand wording, link, and placeholder validation
- `scripts/capture.mjs`: responsive browser, horizontal overflow, navigation, and WCAG A/AA checks

## Registry boundary

The application imports these existing source files without editing them:

- `../data/registry/pages.json`
- `../data/registry/offers.json`
- `../data/registry/targets.json`

The Astro build fails when required fields are missing, AI Jumpstart terms drift from $699 standard and $599 launch price after the $100 discount, plan authority becomes ambiguous, or target records do not match the expected contract.

## Verification evidence

- `npm run build`: Astro 7.1.6 static build passed. Astro Check reported 0 errors, 0 warnings, and 0 hints across 22 files. Six HTML routes were generated.
- `npm run validate`: passed for six routes and six registry records. All internal routes and anchors resolve. No placeholder links, empty links, `javascript:` links, em dashes, or prohibited brand wording were found.
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

1. Authentication and Cloudflare Access are deployment boundaries. This local static proof of concept does not claim that sign-in, credential rotation, repository privacy, or deny-by-default policy work is complete.
2. The current-week operating brief in the repository was last generated July 13. Today surfaces that source as stale and does not repeat its client or pipeline details as current truth.
3. The July 24 delivery tracker contains three clients while the July 29 HQ snapshot reports four active clients. Delivery surfaces the mismatch and withholds a current capacity claim.
4. The page registry currently contains six source records. It is enough to prove the directory and filters, but not enough for a complete content migration.
5. Shared page registry routes still point to current-Hub HTML sources. The standalone Library maps them to owned HQ routes and anchors. A future migration needs canonical HQ route fields or a governed route adapter.
6. Screen-share mode is a local visual mask, not security. Client-confidential content still requires access controls and separate client spaces.
7. The browser check is automated. Owner usability review, print preview review, and testing with real authenticated identities remain future acceptance steps.

## Owner decisions required

1. Approve BPP HQ as the interface name and approve the six-section information architecture.
2. Approve the consulting shell, BI treatment, and Company document treatment.
3. Approve the private HQ and separate external tools boundary.
4. Assign owners and dates for Tier 0 protection and Tier 1 sign-in work.
5. Decide whether the shared page registry should add a canonical HQ route while preserving the current-Hub migration source.
6. Reconcile the active-client count and current sprint source before Delivery becomes an operating dashboard.
7. Approve the content migration order after the proof-of-concept review.
