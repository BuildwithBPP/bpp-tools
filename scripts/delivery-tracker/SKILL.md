---
name: bpp-delivery-tracker
description: Refresh the BPP Delivery Tracker (Gantt + velocity). Pulls the Client Delivery and BPP Internal Monday boards, rebuilds data/delivery-tracker.json via build.py, and POSTs it to the recap worker so the tools-hub page and home module update. Use when Eli says "refresh delivery tracker", "update the gantt", "update delivery tracker", "rebuild the velocity chart", or "/delivery-tracker".
---

# bpp-delivery-tracker

Regenerates the snapshot behind `pages/delivery-tracker.html` and the "Delivery at a Glance"
module on `index.html`. Mirrors the `bpp-monday-prep` pattern: pull live Monday data with the
MCP, transform offline, commit the JSON via the Cloudflare worker (no PR needed for data).

> **This SKILL.md ships inside the bpp-tools repo** (`scripts/delivery-tracker/`) so build.py and the
> runbook stay together. To make it auto-fire from Claude Code, copy or symlink this folder into the
> BPP workspace skills dir — see "Registering as a workspace skill" at the bottom. That copy is Eli's
> call (BPP workspace writes need his consent).

## What it produces

`data/delivery-tracker.json`:
```json
{
  "generated_at": "ISO-8601 Z",
  "gantt":    { "clients": [ { "client": "...", "items": [ { "name","phase","owner","from","to","due","status" } ] } ] },
  "velocity": { "current_sprint": { "number","goal","start","end","span","day","status" },
                "history": [ { "sprint","committed","completed","by_owner": { "<name>": {"committed","completed"} } } ] }
}
```

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

### 3. Publish via the worker (no PR)
POST the file to the recap worker's `/save-tracker` route (same worker + secret as ops.html;
`RECAP_WORKER_URL` / `RECAP_WORKER_SECRET`, mirrored from `pages/ops.html`):
```bash
curl -sS -X POST "$RECAP_WORKER_URL/save-tracker" \
  -H "Authorization: Bearer $RECAP_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  --data @data/delivery-tracker.json
```
Expect `{ "ok": true, "path": "data/delivery-tracker.json", "clients": N, "sprints": M }`.
The worker commits to `main`; GitHub Pages serves the update in ~60s.

If the worker is down, fall back to committing `data/delivery-tracker.json` on a branch and opening a PR.

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

## Registering as a workspace skill (Eli's action — needs consent)
To make `/delivery-tracker` fire from any Claude Code session:
```
ln -s "$HOME/code/bpp-tools/scripts/delivery-tracker" \
      "$HOME/AIOS/BPP Operations - BPP Workspace/_claude/skills/bpp-delivery-tracker"
```
(or copy the folder). Then add it to the BPP SKILL-DICTIONARY.md.

## Piggyback in bpp-monday-prep (Eli's action — needs consent)
`bpp-monday-prep` already pulls the BPP Internal board every Sunday. To keep the tracker fresh
automatically, add a step to that skill after its Monday pulls:
1. Also pull Client Delivery (`18406004595`) with the columns in Step 1 above.
2. Run `scripts/delivery-tracker/build.py` against the two raw pulls.
3. POST the result to `/save-tracker` (Step 3).
The Internal-board pull it already does can be reused as the `--internal` input, so only the
Client Delivery pull + build + POST are new.
