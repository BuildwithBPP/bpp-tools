#!/usr/bin/env python3
"""
build.py — Delivery Tracker data builder for the BPP tools hub.

Transforms two raw monday.com board pulls into data/delivery-tracker.json,
the snapshot that pages/delivery-tracker.html and index.html render.

Inputs (raw output of the monday get_board_items_page tool, one file each):
  --client   Client Delivery board 18406004595  -> Gantt timeline
  --internal BPP Internal board   18406003425   -> Velocity (story points / sprint)

The bpp-delivery-tracker skill writes those two raw files, then runs this,
then POSTs the result to the worker's /save-tracker route. It is also called
by the weekly bpp-monday-prep piggyback step.

Story points live in a monday *status/color* column (color_mm267yph) whose
label IS the number — read the raw value, never a phantom-rendered text.
Velocity = sum of points over Done items, grouped by the Sprint dropdown.
"""
import argparse, json, re, sys
from datetime import date, datetime, timezone

# group id -> clean client display name (Client Delivery board)
CLIENT_NAMES = {
    "group_mm22rqgp": "SEEDFOLKids",
    "group_mm22b0fs": "Financial Acuity",
    "group_mm2cctgg": "Lois Marketing",
    "group_mm2v952v": "HALO Commons",
}
# groups that are not real client work
SKIP_GROUPS = {"new_group29179"}  # ⭐ NEW CLIENT TEMPLATE

DONE_GROUP = "new_group43041"     # Internal board "Done"
SPRINT_GOAL = "Generate leads, reduce friction to close, close more deals"

# Committed points we know from sprint history but that are no longer fully
# on the board (archived items). Live-computed committed understates these.
SEED_COMMITTED = {2: 59}


def short_owner(raw):
    """'Eli Fisher, Daunte Benjamin' -> 'Eli' (first accountable owner)."""
    if not raw:
        return None
    first = raw.split(",")[0].strip()
    return first.split(" ")[0] if first else None


def points(cv):
    v = cv.get("color_mm267yph")
    if isinstance(v, str) and v.isdigit():
        return int(v)
    return 0


def sprint_num(cv):
    d = cv.get("dropdown_mm1w96sd")
    label = d if isinstance(d, str) else None
    if not label:
        return None
    m = re.search(r"(\d+)", label)
    return int(m.group(1)) if m else None


def parse_timeline(tl):
    if not tl or " - " not in tl:
        return None, None
    a, b = tl.split(" - ", 1)
    return a.strip(), b.strip()


def build_gantt(client_raw):
    buckets = {}
    for it in client_raw.get("items", []):
        g = (it.get("group") or {}).get("id")
        if not g or g in SKIP_GROUPS:
            continue
        client = CLIENT_NAMES.get(g, (it.get("group") or {}).get("title") or "Unknown")
        cv = it.get("column_values", {})
        frm, to = parse_timeline(cv.get("project_timeline"))
        if not frm or not to:
            continue  # no scheduled bar -> not on the timeline
        buckets.setdefault(client, []).append({
            "name": it.get("name", "").strip(),
            "phase": cv.get("dropdown_mm1wfknj"),
            "owner": short_owner(cv.get("project_owner")),
            "from": frm,
            "to": to,
            "due": cv.get("date_mm22kzfc"),
            "status": cv.get("project_status"),
        })
    clients = []
    for name, items in buckets.items():
        items.sort(key=lambda x: x["from"])
        clients.append({"client": name, "items": items})
    # stable, useful order: most items first, then name
    clients.sort(key=lambda c: (-len(c["items"]), c["client"]))
    return {"clients": clients}


def build_velocity(internal_raw, today):
    completed, committed = {}, {}
    owner_done, owner_committed = {}, {}
    sprint_titles = {}
    for it in internal_raw.get("items", []):
        cv = it.get("column_values", {})
        sn = sprint_num(cv)
        if sn is None:
            continue
        pts = points(cv)
        grp = it.get("group") or {}
        is_done = grp.get("id") == DONE_GROUP or cv.get("project_status") == "Done"
        if grp.get("title") and "Sprint %d" % sn in (grp.get("title") or ""):
            sprint_titles[sn] = grp.get("title")
        committed[sn] = committed.get(sn, 0) + pts
        owner_committed.setdefault(sn, {})
        owner_done.setdefault(sn, {})
        own = short_owner(cv.get("project_owner")) or "Unassigned"
        owner_committed[sn][own] = owner_committed[sn].get(own, 0) + pts
        if is_done:
            completed[sn] = completed.get(sn, 0) + pts
            owner_done[sn][own] = owner_done[sn].get(own, 0) + pts

    for sn, c in SEED_COMMITTED.items():
        committed[sn] = max(committed.get(sn, 0), c)

    history = []
    for sn in sorted(set(completed) | set(committed)):
        by_owner = {}
        for own in set(owner_committed.get(sn, {})) | set(owner_done.get(sn, {})):
            by_owner[own] = {
                "committed": owner_committed.get(sn, {}).get(own, 0),
                "completed": owner_done.get(sn, {}).get(own, 0),
            }
        history.append({
            "sprint": sn,
            "committed": committed.get(sn, 0),
            "completed": completed.get(sn, 0),
            "by_owner": by_owner,
        })

    cur = max((h["sprint"] for h in history), default=None)
    current = None
    if cur is not None:
        start = end = span = day = None
        status = "active"
        title = sprint_titles.get(cur, "")
        m = re.search(r"\(([^)]+)\)", title)  # "(Jun 15 - Jul 18)"
        if m:
            try:
                a, b = m.group(1).split(" - ")
                yr = today.year
                start = datetime.strptime("%s %d" % (a.strip(), yr), "%b %d %Y").date()
                end = datetime.strptime("%s %d" % (b.strip(), yr), "%b %d %Y").date()
                span = (end - start).days + 1
                elapsed = (today - start).days + 1
                day = max(1, min(elapsed, span))
                if today > end:
                    status = "closed"
            except ValueError:
                pass
        current = {
            "number": cur,
            "goal": SPRINT_GOAL,
            "start": start.isoformat() if start else None,
            "end": end.isoformat() if end else None,
            "span": span,
            "day": day,
            "status": status,
        }
    return {"current_sprint": current, "history": history}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--client", required=True)
    ap.add_argument("--internal", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    with open(args.client) as f:
        client_raw = json.load(f)
    with open(args.internal) as f:
        internal_raw = json.load(f)

    today = datetime.now(timezone.utc).date()
    out = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "gantt": build_gantt(client_raw),
        "velocity": build_velocity(internal_raw, today),
    }
    with open(args.out, "w") as f:
        json.dump(out, f, indent=2)

    v = out["velocity"]
    print("Wrote %s" % args.out)
    print("  clients: %d" % len(out["gantt"]["clients"]))
    for c in out["gantt"]["clients"]:
        print("    %-18s %d items" % (c["client"], len(c["items"])))
    print("  sprints:")
    for h in v["history"]:
        print("    Sprint %d: %d/%d completed/committed" % (h["sprint"], h["completed"], h["committed"]))
    cur = v["current_sprint"]
    if cur:
        print("  current: Sprint %s (%s, day %s/%s)" % (cur["number"], cur["status"], cur["day"], cur["span"]))


if __name__ == "__main__":
    sys.exit(main())
