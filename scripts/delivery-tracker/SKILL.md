---
name: bpp-delivery-tracker
description: Refresh the BPP Delivery Tracker (Health + Gantt + velocity). Pulls the Client Delivery and BPP Internal Monday boards, rebuilds data/delivery-tracker.json via build.py, and commits it so the tools-hub page and home module update. Use when Eli says "refresh delivery tracker", "update the gantt", "update delivery tracker", "rebuild the velocity chart", or "/delivery-tracker".
---

# bpp-delivery-tracker

Regenerates the snapshot behind `pages/delivery-tracker.html` and the "Delivery at a Glance"
module on `index.html`. Mirrors the `bpp-monday-prep` pattern: pull live Monday data with the
MCP, transform offline, then commit the JSON (direct git commit; the worker path is optional).

> **Team skill — lives in the BPP workspace** (`_claude/skills/bpp-delivery-tracker/`), so anyone with
> the workspace can run it. The runnable **`build.py` lives in the `bpp-tools` repo** at
> `scripts/delivery-tracker/build.py` (you have it via your `bpp-tools` clone — Daunte:
> `C:/Users/dtben/Developer/bpp-tools`, Eli: `~/code/bpp-tools`). Same convention as `bpp-monday-prep`,
> which also drives the `bpp-tools` clone. All paths below are relative to your `bpp-tools` clone.

## What it produces

`data/delivery-tracker.json`:
```json
{
  "generated_at": "ISO-8601 Z",
  "gantt": { "clients": [ { "client": "...", "items": [
    { "name","phase","owner","from","to","due","status","updated_at" } ] } ] },
  "velocity": {
    "current_sprint": { "number","goal","start","end","span","day","status" },
    "history": [ { "sprint","committed","completed","carryover","reliability",
                   "throughput","health","by_owner": { "<name>": {"committed","completed"} } } ],
    "rolling_avg": 30.7,
    "band": { "min","max" },
    "backlog_points": 234,
    "forecast": { "backlog_points","low_sprints","high_sprints","mid_sprints" },
    "target": { "low":25, "high":35, "team":3 }
  }
}
```

Field notes:
- `updated_at` (YYYY-MM-DD) drives the Health tab's staleness / "no silent weeks" flags. It is the item-level timestamp monday returns by default — **pull it** (don't strip it from the raw file).
- `reliability` = completed/committed %. `carryover` = committed - completed. `throughput` = count of Done items. `health` = green/amber/red from reliability + carryover.
- `backlog_points` = sum of open story points in the **Product Backlog** group (`new_group29179`). Pull the FULL internal board so this is complete. `forecast` divides it by the recent velocity `band`.
- The Health tab (RAG per client, at-risk, KPIs) is computed **client-side** in the page from the gantt items + today's date — build.py just needs to pass `updated_at` through.

## Steps

### 1. Pull the two boards (Monday MCP)
Use `get_board_items_page` with `includeColumns=true`, `includeGroup=true`. Parent items only
(subitems carry no story points and are out of scope for v1).

**Client Delivery — board `18406004595`** (Gantt). Columns:
`project_timeline` (from/to = bars), `date_mm22kzfc` (due), `dropdown_mm1wfknj` (Phase),
`project_owner`, `project_status`, `text_mm1w2d5f` (company).

**BPP Internal — board `18406003425`** (velocity). Columns:
`color_mm267yph` (Story Points — a status/color column; read the raw `value`, never `text`,
which phantom-renders a stale "13"), `dropdown_mm1w96sd` (Sprint), `project_owner`,
`project_status`. The Done group is `new_group43041`.

Write each raw tool response to a temp file, e.g.
`/tmp/dt-client.json` and `/tmp/dt-internal.json`, in the exact `{board, items:[...]}` shape the
tool returns (the fields listed above per item, plus `group.{id,title}`).

### 2. Build the snapshot
```bash
python3 scripts/delivery-tracker/build.py \
  --client /tmp/dt-client.json \
  --internal /tmp/dt-internal.json \
  --out data/delivery-tracker.json
```
The script prints a summary. Sanity check: **Sprint 2 completed should be 30** (known-good anchor);
each client's item count should match the board.

### 3. Publish (commit the JSON)
**Primary path — direct commit (this is what the skill run does):** the skill runs inside Claude
Code with git access, so just commit and push the file. Push to `main` is blocked by the harness,
so branch + PR (or merge if authorized):
```bash
git checkout -b eli/delivery-refresh
git add data/delivery-tracker.json && git commit -m "Refresh delivery-tracker snapshot"
git push -u origin eli/delivery-refresh && gh pr create --fill --base main
```
GitHub Pages serves the update ~60s after merge.

**Optional path — worker (browser-triggered saves only):** the worker's `POST /save-tracker` route
exists for a future in-page "Refresh" button. It is **not deployed yet** — the `bpp-recap-worker`
lives on a Cloudflare account whose owner must run `wrangler deploy`. Until then, use the direct
commit above. When live:
```bash
curl -sS -X POST "$RECAP_WORKER_URL/save-tracker" -H "Authorization: Bearer $RECAP_WORKER_SECRET" \
  -H "Content-Type: application/json" --data @data/delivery-tracker.json
```

**Preserving sprint history after a board reset:** when a sprint's open items are parked back to the
Product Backlog (so the board only keeps its Done items), the live-computed `committed` drops. Add
that sprint's original committed points to `SEED_COMMITTED` in build.py so the honest reliability
stays (e.g. Sprint 2 = 59, Sprint 3 = 55).

### 4. Verify
Open `https://buildwithbpp.github.io/bpp-tools/pages/delivery-tracker.html` and confirm both tabs
render with the new `generated_at` date.

## Notes / gotchas
- **Story points are a color column** — the label IS the number; read `value`. A cleared cell
  phantom-renders "13" in `text`. build.py already guards this (`str.isdigit()` on `value`).
- **No dependency column** on either board — the Gantt is a scheduled-timeline view, not a
  predecessor graph. That's by design; the page says so.
- **SEEDFOLKids** currently has no items in the Client Delivery board group, so it won't appear
  until deliverables are added. The builder maps groups → clean client names in `CLIENT_NAMES`.
- **Sprint history seeds:** `SEED_COMMITTED` in build.py overrides committed points for archived
  sprints (Sprint 2 = 59) that are no longer fully on the board.

## Deferred (need a data-capture change, not built)
These need history or timestamps a single snapshot can't provide. Build only if the pull starts
capturing them over time:
- **Daily burndown / burnup** — needs a *daily* remaining-work series (store snapshots over time, or
  read monday's activity log). The Velocity tab's committed-vs-completed columns are the static stand-in.
- **Cycle time / lead time / control chart** — needs per-item start + done timestamps from monday's
  status-change history, not just the current state.
- **% complete inside Gantt bars** — needs a numeric progress column on the board (don't fabricate it).

## Registration status (done)
- **In the workspace:** this skill lives at `_claude/skills/bpp-delivery-tracker/` and is listed in
  `_claude/skills/SKILL-DICTIONARY.md`, so any teammate with the workspace + a `bpp-tools` clone can
  run it. Load the dictionary at session start so the trigger registers.
- **Weekly auto-refresh:** wired into `bpp-monday-prep` **Step 11.7** — the Sunday 8pm run rebuilds
  `data/delivery-tracker.json` and commits it alongside the other snapshots. No manual step needed
  for the weekly refresh; use this skill on demand for an off-cycle update.
