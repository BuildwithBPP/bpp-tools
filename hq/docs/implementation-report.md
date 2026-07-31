# BPP HQ proof-of-concept implementation report

**Status:** STAGING_CONNECTOR_ACTIVATION_IN_PROGRESS

**Implementation date:** July 29-31, 2026

**Branch:** `codex/protected-preview`

**Application boundary:** `hq/`

## Delivered routes

| Route | Purpose | Delivery level |
|---|---|---|
| `/` | Today leadership brief | Detailed first pass |
| `/performance/` | Executive scorecard and Monthly Review view | Structured first pass |
| `/growth/` | Pipeline, approved offers, and commercial priorities | Structured first pass |
| `/delivery/` | Engagement health, milestones, capacity state, and quality tools | Structured first pass |
| `/company/` | Plan of Record, strategy, targets, ownership cockpits, cadence, and systems | Detailed first pass |
| `/company/data-refresh/` | Refresh contracts, schedules, controls, history model, and failure behavior | Production-oriented foundation |
| `/company/departments/[slug]/` | Six department charters, owners, outcomes, KPIs, routines, assets, and dependencies | Detailed first pass |
| `/company/technical-landscape/` | Nontechnical repository architecture, system flow, consolidation queue, and client value | Detailed first pass |
| `/library/` | Complete 71-artifact HTML inventory with search, filters, proposed department, lifecycle, disposition, ownership, confidentiality, and source links | Owner review workspace |

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
- `src/components/RevenueTrendChart.astro`: accessible, CSP-safe SVG chart with a zero baseline and visible monthly values
- `src/data/registries.ts`: build-time Zod validation of the read-only shared registries
- `src/data/page-catalog.json`: complete catalog of all 71 current and historical HTML artifacts
- `src/data/page-routing.mjs`: proposed department routing kept separate from current source truth
- `src/data/departments.ts`: shared definition of the six department cockpits
- `src/data/refresh-sources.json`: six production refresh contracts and their proposed schedules
- `refresh-worker/`: authenticated refresh API, connector boundary, D1/R2 history storage, scheduled triggers, and last-known-good behavior
- `data/registry/repositories.json`: reviewed classification of the 12 repositories visible to the connected BPP GitHub account
- `src/data/snapshot.ts`: validation of representative performance and delivery snapshots
- `src/styles/global.css`: BPP tokens, shell, page patterns, focus, responsive rules, screen-share treatment, and print rules
- `public/brand/bpp-b-mark.png`: local copy of the canonical transparent BPP mark
- `scripts/validate.mjs`: route, schema, semantic structure, brand wording, link, and placeholder validation
- `scripts/freshness.test.mjs`: calendar-based freshness tests that prevent a frozen proof date from disabling stale warnings
- `scripts/capture.mjs`: responsive browser, horizontal overflow, navigation, and WCAG A/AA checks

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

## July 31 extension

- Replaced the frozen July 29 freshness snapshot with a calendar-based comparison that advances at build time.
- Added five focused freshness tests, including stale progression and impossible-date rejection.
- Added a seventh route at `/company/technical-landscape/`.
- Added a validated repository registry with 12 records grouped into business brain, internal HQ, AI capabilities, public growth, governance, reusable delivery, client implementation, and experimental lanes.
- Classified `bpp-workspace`, `bpp-tools`, `bpp-plugins`, and `bpp-free-tools` as essential. Classified `.github` as supporting governance.
- Recorded the current Webflow repository as deprioritized because it is no longer a dependable website backup.
- Separated active repositories from the review, consolidation, and archive queue without deleting any repository.
- Explained BPP's client differentiation as a four-step method: diagnose, design, build, and adopt.
- Added the Technical Landscape to Company and the Library registry.

## July 31 production-readiness extension

- Cataloged every HTML artifact in the repository exactly once: 71 total, including current, historical, archived, client-guide, root, and generated-template files. The Care Plan v1 draft was removed on `main` and is intentionally absent.
- Added an owner-review Library table with filters for HQ section, proposed department, lifecycle, migration decision, owner, and confidentiality. Department assignments are explicitly proposed until the owners approve them. Nothing is deleted.
- Added six department cockpit routes generated from one shared department definition.
- Rebuilt the Performance revenue trend as an accessible SVG chart with a true zero baseline, readable month values, and responsive horizontal scrolling when needed.
- Removed inline scripts and inline styles so the deployed site can enforce `script-src 'self'` without `unsafe-inline`.
- Added separate staging and production configuration guidance. Production now has an executable configuration contract that requires protected `bpp-hq.pages.dev`, a separate Worker, D1 database, and R2 bucket, while treating the custom hostname as optional. The current shell identifies itself as private staging, and no production cutover is included.
- Hardened the staging credential uploader so later provider additions preserve the existing Access audience and AES-GCM encryption key. New-environment initialization creates only missing infrastructure secrets and cannot silently rotate an existing key.
- Added the Refresh Center and a separate Worker foundation for QuickBooks, HubSpot, Monday.com, Metricool, GitHub, and the BPP Workspace.
- Added scheduled and owner-triggered refresh paths that validate data, archive the raw response, preserve the last-known-good snapshot on failure, and expose snapshot history.
- Kept all connector controls visibly disabled until real staging credentials, D1, R2, same-origin routing, and Cloudflare Access values are configured.

## July 31 connector activation extension

- Replaced generic source-gateway placeholders with direct, read-only adapters for QuickBooks Online, HubSpot, Monday.com, GitHub, and the private BPP Workspace.
- Kept Metricool behind a governed bridge until BPP's plan entitlement and exact API contract are confirmed.
- Added complete pagination for HubSpot deals, Monday items, and GitHub repositories. Monday subitems remain part of the snapshot.
- Added GitHub App authentication as the preferred route. The Worker mints short-lived installation tokens and does not require an owner's GitHub CLI token.
- Added QuickBooks OAuth refresh and four cash-basis reports: Profit and Loss, Balance Sheet, Cash Flow, and Aged Receivables.
- Added AES-GCM encryption for rotated QuickBooks refresh tokens and a second D1 migration for encrypted connector credentials.
- Created staging D1 `bpp-hq-staging-data`, applied both migrations remotely, and verified all four expected tables.
- Added a staging Wrangler configuration, a local secure-prompt upload script, and the owner activation runbook at `docs/friday-connector-activation.md`.
- Updated the Refresh Center to query live source status, enable only configured sources, and show last-success or last-error evidence.
- Enabled R2 and created the isolated Standard-class staging bucket `bpp-hq-staging-snapshots`.
- Deployed `bpp-hq-refresh-staging` with D1, R2, daily and Monday schedules, Access JWT verification, exact-owner authorization, and AES-GCM credential encryption.
- Added a narrow same-origin Pages Function for governed `/api/*` requests and bound it privately to the refresh Worker as `REFRESH_SERVICE`.
- Enabled Pages Preview Access and verified anonymous HTTP 302 redirects for the stable site, a generated deployment URL, and the Pages API. The Worker direct URL returns HTTP 403.
- Verified that GoDaddy CNAME `hq-staging` correctly resolves to the Pages project. The first activation returned public HTTP 200 because Pages Preview Access does not protect the custom hostname. The custom hostname was immediately detached and serves no HQ content. A later authenticated Access API attempt returned error `12130`, `domain does not belong to zone`; the Cloudflare account has no `buildwithbpp.com` zone. Reattachment now requires an explicit authoritative-DNS decision, not another Access-permission attempt.

## Registry boundary

The application imports these shared source files:

- `../data/registry/pages.json`
- `../data/registry/offers.json`
- `../data/registry/targets.json`
- `../data/registry/repositories.json`

The Astro build fails when required fields are missing, AI Jumpstart terms drift from $699 standard and $599 launch price after the $100 discount, plan authority becomes ambiguous, or target records do not match the expected contract.

## Verification evidence

- `npm run build`: Astro 7.1.6 static build passed. Astro Check reported 0 errors, 0 warnings, and 0 hints across 43 files. Fourteen HTML routes were generated.
- `npm run validate`: passed for 14 routes. Utility source/freshness metadata, HR ownership truth, preview security metadata, CSP rules, and internal routes are enforced. No placeholder links, empty links, `javascript:` links, inline scripts, or inline styles were found.
- Unit tests: 54/54 passed across Cloudflare Access policy, custom-domain validation, freshness behavior, exact 71-file catalog coverage, proposed department routing, refresh history, failure recovery, source-envelope integrity, connector-disabled behavior, exact-owner authorization, exact multi-host origin policy, schedules, direct adapters, pagination, GitHub App authentication, encrypted credentials, live-status UI behavior, the same-origin Pages proxy, fail-closed staging-boundary checks, production environment separation, infrastructure-secret preservation, and static shell assets.
- GitHub automation: `.github/workflows/hq-quality.yml` runs the locked install, complete test suite, production dependency audit, and Worker dry-run for relevant pull requests and main-branch changes.
- Live boundary command: `npm run verify:staging` requires Access redirects for stable and generated Pages routes and a direct 403 from the Worker.
- Worker deployment: `bpp-hq-refresh-staging` version `d1db9733-2e62-4283-a909-5bc157aa6c57` is live with an 89.18 KiB bundle before gzip. It accepts only the protected Pages origin; the detached custom hostname is excluded. The direct API returns 403 anonymously.
- Pages deployment: `c4caeeba.bpp-hq-preview.pages.dev` uploaded the Functions bundle from commit `12c4c73`; the post-deploy boundary check returned 302 for stable and generated site/API routes and 403 for the direct Worker.
- Staging D1: `bpp-hq-staging-data` was created in ENAM. Migrations 0001 and 0002 applied successfully and the remote schema contains `refresh_jobs`, `snapshots`, `source_status`, and `connector_credentials`.
- Responsive check: the Technical Landscape has no page-level horizontal overflow at 1440 or 390 pixels. The mobile shell and wide repository tables remain usable.
- Browser QA: passed on all 14 routes at 1440, 1024, 768, and 390 pixels. No page-level horizontal overflow was detected.
- Accessibility: automated WCAG 2 A/AA and WCAG 2.1 A/AA checks passed on all 14 routes at 1440 and 390 pixels.
- Lighthouse: Today, Performance, Company, and Library scored 98-100 for performance and 100 for accessibility. Adding the declared BPP favicon removed the only browser-console 404 and raised the representative Best Practices score to 100. SEO indexing remains intentionally disabled for the private HQ.
- Metrics: validation confirms every rendered metric includes a source and timeframe.
- Dependency audit: `npm audit --omit=dev` reports 0 vulnerabilities after upgrading to Astro 7.1.6 and updating the lockfile.
- Screenshots:
  - `artifacts/today-desktop.png`
  - `artifacts/today-mobile.png`
  - `artifacts/company-desktop.png`
  - `artifacts/company-mobile.png`
  - `artifacts/performance-desktop.png`
  - `artifacts/library-desktop.png`
  - `artifacts/data-refresh-desktop.png`

## Known limitations and concerns

1. Authentication and Cloudflare Access are deployment boundaries. This local static proof of concept does not claim that sign-in, credential rotation, repository privacy, or deny-by-default policy work is complete.
2. The current-week operating brief in the repository was last generated July 13. Today surfaces that source as stale and does not repeat its client or pipeline details as current truth.
3. The July 24 delivery tracker contains three clients while the July 29 HQ snapshot reports four active clients. Delivery surfaces the mismatch and withholds a current capacity claim.
4. The 71-file inventory is complete, but its proposed department assignments and migration decisions still require owner review before they become canonical routing.
5. Inventory source links still open the current Hub. A future migration will replace them with approved HQ routes or explicit redirects without erasing historical source records.
6. The refresh service, D1, R2, schedules, Access audience, and same-origin service binding are live in staging. It still needs provider authorizations entered outside the repository and authenticated owner acceptance of the Refresh Center.
7. Screen-share mode is a local visual mask, not security. Client-confidential content still requires access controls and separate client spaces.
8. The browser check is automated. Owner usability review, print preview review, and testing with Kenny and Eli's authenticated identities remain future acceptance steps.
9. The repository map records business classification and direction, but it does not authorize deletion. Each cleanup candidate still needs dependency, retention, and client-obligation checks.

## Owner decisions required

1. Approve BPP HQ as the interface name and approve the six-section information architecture.
2. Approve the consulting shell, BI treatment, and Company document treatment.
3. Approve the private HQ and separate external tools boundary.
4. Assign owners and dates for Tier 0 protection and Tier 1 sign-in work.
5. Review all 71 Library records and approve or change their proposed department and migration decision.
6. Authorize each available staging connector through the provider-specific read-only setup. Keep Metricool unavailable if the account does not expose a supported API route.
7. Reconcile the active-client count and current sprint source before Delivery becomes an operating dashboard.
8. Approve the content migration order after the proof-of-concept review.
