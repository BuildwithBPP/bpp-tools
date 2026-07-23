# Performance Dashboard — generator

Builds `pages/performance-dashboard.html` — the sliceable (year / quarter / month) BPP metrics dashboard. Data is embedded in the page (no runtime fetch, so it works from `file://` and GitHub Pages alike).

## Files
- `build_data.py` — reads the data warehouses + inline HubSpot/July-social data, emits `monthly_data.json` (the monthly data model).
- `template.html` — the dashboard shell + JS render engine, with a `__DATA__` placeholder.
- `monthly_data.json` — last generated data model (kept for reference).

## Sources
- **Financial**: `1. Internal Operations/7. Data Analytics/DA-004 - Financial Database/` (monthly-pnl.csv, account-by-month.csv) — QuickBooks cash basis.
- **Social + website**: `DA-003 - Social Media Database/` daily CSVs (Metricool).
- **Sales**: HubSpot closed-won / closed-lost by close date — pasted inline in `build_data.py` (re-pull each refresh). Financial Acuity's $3,350 booking is deliberately attributed to Q1 (Jan) to match the team's ratified quarterly attribution, not HubSpot's May close date.

## Regenerate (each quarter, after DA-003/DA-004 are refreshed)
1. Refresh DA-003 (Metricool pull) and DA-004 (QB transaction report → analyzer).
2. Re-pull HubSpot closed-won + closed-lost for the new range; update the `won`/`lost` lists in `build_data.py`. Add the new quarter's social to the July-style inline block if not yet in DA-003.
3. `python build_data.py` → writes `monthly_data.json`.
4. Inject: replace `__DATA__` in `template.html` with the JSON contents, write to `../../pages/performance-dashboard.html`.
   ```python
   tpl=open("template.html",encoding="utf-8").read()
   data=open("monthly_data.json",encoding="utf-8").read()
   open("../../pages/performance-dashboard.html","w",encoding="utf-8").write(tpl.replace("__DATA__",data))
   ```
5. Screenshot-verify a couple of slices, commit, push.

## Design system
Adopted from `financial-position-v2.html`: Inter typography, tabular numerals, refined navy/gold palette, tile accent bars, status chips, and hand-built gradient SVG charts (rendered dynamically here). This is the preferred "sharp" style for BPP dashboards going forward.
