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
3. Run the all-in-one local command. It validates the required CSV inputs, checks freshness, writes `monthly_data.json`, and renders `pages/performance-dashboard.html`.
   ```powershell
   python build_data.py --validate-sources --render
   ```
   On a different machine, pass portable source paths explicitly:
   ```powershell
   python build_data.py --social-dir "C:\path\to\DA-003" --financial-dir "C:\path\to\DA-004" --validate-sources --render
   ```
4. Screenshot-verify a couple of slices, commit, push.

`--max-source-age-days 31` is the default freshness guard. Use a tighter number when the review period requires it. The sales and July social records remain intentionally inline and must be refreshed as described above.

Source locations are portable. Pass `--social-dir` and `--financial-dir`, set `BPP_DASHBOARD_SOCIAL_DIR` and `BPP_DASHBOARD_FINANCIAL_DIR`, or run the command from a BPP workspace descendant so the script can safely discover the two data directories. Validation reports the financial and social source families separately.

## Point-in-time data (Scoreboard, Sales pipeline, Clients, AI & Tech, Referrals)
These tabs do **not** come from `build_data.py`. The page fetches `data/scoreboard.json` at load time:
- `auto`: rewritten from HubSpot by `scripts/scoreboard/refresh_scoreboard.py`, run by the **Scoreboard refresh** GitHub Action (`.github/workflows/scoreboard-refresh.yml`) every Sunday + Wednesday ~6am ET, or on demand from the repo's Actions tab. Never hand-edit it. The HubSpot deals in `auto.deals` also override the won/lost-by-month history, so the inline HubSpot lists in `build_data.py` no longer need a manual re-pull.
- `manual`: team-owned (targets, people, clients, commitments, fixes, referrals, `ai` for Daunte's tab, deal overrides). The Action never touches it.

`template.html` carries the loader, so re-rendering with `build_data.py --render` keeps all of this.

## Design system
Adopted from `financial-position-v2.html`: Inter typography, tabular numerals, refined navy/gold palette, tile accent bars, status chips, and hand-built gradient SVG charts (rendered dynamically here). This is the preferred "sharp" style for BPP dashboards going forward.
