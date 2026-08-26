# Definition of Done: Client Delivery Command Center

**What we're building:** A checkpoint-first delivery command center for Eli's Legacy B and HALO website projects inside the Astro HQ.
**Out of scope:** Outlook ingestion, authenticated production writes, D1, permanent delete, team capacity percentages, other package templates.
**Done means:** The five views pass UX-01 through UX-09, the local-only Monday adapter passes read-back tests, and the release candidate is verified in a real browser.
**Release target:** local-only
**Release authority:** Eli approved feature-branch files and local verification on 2026-08-26. Push, merge, public deployment, production credentials, and shared Monday mutation remain outside current authority.
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
- [ ] Clean feature branch used in small batches.
- [ ] UI built against approved BPP alignment layer.
- [ ] No speculative integrations or public writes added.
- [ ] Change compiles.

## 3. TEST
- [ ] Critical calculations and mutation/read-back seams tested incrementally.
- [ ] Failures diagnosed to root cause.
- [ ] Format check or N/A reason recorded.
- [ ] Lint/static analysis or N/A reason recorded.
- [ ] Type/schema check green.
- [ ] Build and project validation green.
- [ ] Pre-commit bootstrap decision recorded.

## 4. REVIEW + UAT
- [ ] Code review clean.
- [ ] Security audit clean for API/env surface.
- [ ] Design QA verdict SHIP.
- [ ] UX-01 through UX-09 each record actual evidence and PASS/FAIL.
- [ ] Local real-app journey exercised.

## 4.5. GAUNTLET GATE
- [ ] Mark N/A unless Eli supplies a named comparison bar and hard ceiling.

## 5. DEPLOY
- [ ] Local-only release authority recorded.
- [ ] Rollback triggers recorded.
- [ ] Conventional commits complete.
- [ ] Local production build verified.
- [ ] Push/merge/production marked N/A without authority.

## 6. MONITOR
- [ ] Local destination checked, not only build status.
- [ ] Critical journey repeated after final build.
- [ ] Success metric remains inside threshold.

## 7. CONTROL
- [ ] README and implementation report current.
- [ ] Release evidence receipt complete.
- [ ] Surprise from baseline schema drift captured in project docs.
- [ ] Portfolio eligibility marked.
