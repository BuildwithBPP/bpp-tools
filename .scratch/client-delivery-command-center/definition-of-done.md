# Definition of Done: Client Delivery Command Center

**What we're building:** A checkpoint-first delivery command center for Eli's Legacy B and HALO website projects inside the Astro HQ.
**Out of scope:** Outlook ingestion, authenticated production writes, D1, permanent delete, team capacity percentages, other package templates.
**Done means:** The five views pass UX-01 through UX-09, the local-only Monday adapter passes read-back tests, and the release candidate is verified in a real browser.
**Release target:** public legacy GitHub Pages Hub, read-only, no sign-in
**Release authority:** Eli approved feature-branch files and local verification on 2026-08-26, then explicitly authorized the public older-Hub release without sign-in on 2026-08-27. Production credentials and shared Monday mutation remain outside current authority.
**Success metric:** 100% of UX-01 through UX-09 pass; zero console or WCAG A/AA failures; zero mutation path can show Confirmed without matching read-back.
**Monitoring window:** One complete local critical-journey pass after the final build plus repeat route health check.
**Rollback triggers:** Build/test regression, any public credential/write path, any false Confirmed state, client data leakage, page overflow at tested widths, or two-plus AI-design tells.

## 1. PLAN
- [x] Intent pressure-tested; static-only and second-task-system alternatives rejected.
- [x] Approved design spec exists.
- [x] UX handoff is READY.
- [x] Acceptance contract UX-01 through UX-09 recorded.
- [x] Implementation plan sequenced.
- [x] Alignment layer loaded from BPP tokens, `CLAUDE.md`, and current HQ pages.
- [x] Eli approved the direction and authorized the build.
- [x] Tracer-bullet issue files created.

## 2. WRITE
- [x] Clean feature branch used in small batches.
- [x] UI built against approved BPP alignment layer.
- [x] No speculative integrations or public writes added.
- [x] Change compiles.

## 3. TEST
- [x] Critical calculations and mutation/read-back seams tested incrementally.
- [x] Failures diagnosed to root cause.
- [x] Format check N/A: repository has no formatter script; Astro Check and deterministic static validation cover changed source.
- [x] Lint/static analysis N/A: repository has no lint script; Astro Check returned 0 errors, warnings, or hints.
- [x] Type/schema check green.
- [x] Build and project validation green.
- [x] Pre-commit bootstrap N/A: no hook added for this isolated feature; the full local gate ran before commit.

## 4. REVIEW + UAT
- [x] Code review clean.
- [x] Security audit records the explicitly accepted public data exposure and preserves the read-only browser boundary.
- [x] Design QA verdict SHIP.
- [x] UX-01 through UX-09 each record actual evidence and PASS/FAIL.
- [x] Local real-app journey exercised.

## 4.5. GAUNTLET GATE
- [x] N/A: no named comparison bar or hard ceiling supplied.

## 5. DEPLOY
- [x] Local-only release authority recorded.
- [x] Rollback triggers recorded.
- [x] Conventional commits complete.
- [x] Local production build verified.
- [x] Push/merge/production marked N/A without authority.

## 6. MONITOR
- [x] Local destination checked, not only build status.
- [x] Critical journey repeated after final build.
- [x] Success metric remains inside threshold.

## 7. CONTROL
- [x] README and implementation report current.
- [x] Release and security evidence receipts complete.
- [x] Surprise from baseline schema drift captured in project docs.
- [x] Portfolio eligibility marked internal-only because screenshots contain client delivery data.
