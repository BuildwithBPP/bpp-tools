# Interim Hub implementation report

## Scope completed

- Made the BPP 2026–2028 Business Plan visibly the Plan of Record.
- Preserved Strategic Plan v9 as historical, superseded planning input and removed it from the primary Strategy landing page.
- Routed the Monthly Review card to the Performance Dashboard.
- Added Seller Start Here and connected it from Sales, Strategy, and Library surfaces.
- Replaced pre-call and kickoff placeholder links with workflow action cards or clear unavailable states.
- Corrected AI Jumpstart Setup to show $599 launch price, $699 standard, and the $100 launch discount without stacking.
- Corrected current-team references for Justin Smith's July 8 departure using the existing team context. Marketing orchestration defaults to Kenny pending reassignment.
- Added generated Skill Directory and What We Built inventories, a single refresh command, tests, and safe browser rendering states.
- Added a single Performance Dashboard build command that validates CSV freshness, writes JSON, and renders the final HTML.

## Files changed

- Current Hub pages: `pages/business-plan.html`, `pages/strategic-plan.html`, `pages/strategy.html`, `pages/reviews.html`, `pages/seller-start.html`, `pages/pre-call.html`, `pages/kickoff.html`, `pages/service-packages.html`, `pages/team.html`, `pages/content-dashboard.html`, `pages/dept-sales.html`, `pages/library.html`, `pages/skill-dictionary.html`, and `pages/builds.html`.
- Generated inventory data: `data/generated/skills.json` and `data/generated/builds-snapshot.json`.
- Inventory tooling: `scripts/hub-inventory/` and `scripts/refresh_hub.py`.
- Dashboard tooling: `scripts/performance-dashboard/build_data.py` and its README.

## Commands and results

```powershell
python -m unittest scripts/hub-inventory/tests/test_generators.py
```

Result: 2 tests passed.

```powershell
python scripts/refresh_hub.py --workspace-root "C:\path\to\BPP Workspace" --repo-root .
python -m json.tool data/generated/skills.json
python -m json.tool data/generated/builds-snapshot.json
```

Result: both snapshots generated and validated. The current snapshot contains 77 BPP-built skills and no local absolute paths, instruction bodies, secret-pattern matches, or commit messages.

```powershell
python scripts/performance-dashboard/build_data.py --social-dir "C:\path\to\DA-003" --financial-dir "C:\path\to\DA-004" --validate-sources --render
```

Result: source validation passed. The newest CSV was 7.4 days old. `monthly_data.json` and `pages/performance-dashboard.html` rendered successfully.

The relative-link audit across touched pages passed. The placeholder `href="#"` audit across touched functional surfaces returned no matches. `git diff --check` passed.

## Known limitations

- The generated snapshots are static. Run `python scripts/refresh_hub.py` after skill, plugin, or repository changes and before publishing a fresh internal build.
- The checked-in snapshot currently scans the workspace skill root only. Add explicit `--skills-root` entries for BPP-customized, third-party, and system-provided roots when those inventories should be published.
- The Performance Dashboard still uses intentionally inline HubSpot and July social records. CSV freshness validates the warehouse files, but a dashboard refresh still requires an owner to update those inline records when new source data is pulled.
- The existing current-week file was more than seven days old at implementation time, so it was not used to state current client or pipeline status.

## Owner decisions still needed

1. Confirm the permanent owner or contractor assignment for marketing orchestration and KJ direction after the current Kenny default.
2. Confirm which additional skill roots should be exposed in the internal generated inventory and their classifications.
3. Confirm the refresh cadence and whether CI or a scheduled task should run `scripts/refresh_hub.py` before internal deployment.
