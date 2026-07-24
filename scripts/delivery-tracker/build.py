#!/usr/bin/env python3
"""
build.py - Delivery Tracker data builder for the BPP tools hub.

Transforms two raw monday.com board pulls into data/delivery-tracker.json,
the snapshot that pages/delivery-tracker.html and index.html render.

Inputs (raw output of the monday get_board_items_page tool, one file each):
  --client   Client Delivery board 18406004595  -> Gantt timeline + delivery health
  --internal BPP Internal board   18406003425   -> Velocity + forecast

Pull the client board WITH the item-level `updated_at` timestamp (returned by
default) - it powers the "no silent weeks" staleness flags on the Health tab.
Pull the FULL internal board (incl. Product Backlog group) so the forecast can
sum remaining backlog points.

Story points live in a monday status/color column (color_mm267yph) whose label
IS the number - read the raw value, never a phantom-rendered text.
Velocity = sum of points over Done items, grouped by the Sprint dropdown.
"""
import argparse, json, re, sys
from datetime import datetime, timezone

CLIENT_NAMES = {
    "group_mm22rqgp": "SEEDFOLKids",
    "group_mm22b0fs": "Financial Acuity",
    "group_mm2cctgg": "Lois Marketing",
    "group_mm2v952v": "HALO Commons",
}
SKIP_GROUPS = {"new_group29179"}   # client board: NEW CLIENT TEMPLATE
BACKLOG_GROUP = "new_group29179"   # internal board: Product Backlog
DONE_GROUP = "new_group43041"      # internal board: Done
SPRINT_GOAL = "Generate leads, reduce friction to close, close more deals"
SEED_COMMITTED = {2: 59}           # archived sprints understate committed on the board
TARGET_LOW, TARGET_HIGH, TEAM_SIZE = 25, 35, 3


def short_owner(raw):
    if not raw:
        return None
    first = raw.split(",")[0].strip()
    return first.split(" ")[0] if first else None


def points(cv):
    v = cv.get("color_mm267yph")
    return int(v) if isinstance(v, str) and v.isdigit() else 0


def sprint_num(cv):
    d = cv.get("dropdown_mm1w96sd")
    m = re.search(r"(\d+)", d) if isinstance(d, str) else None
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
            continue
        buckets.setdefault(client, []).append({
            "name": it.get("name", "").strip(),
            "phase": cv.get("dropdown_mm1wfknj"),
            "owner": short_owner(cv.get("project_owner")),
            "from": frm,
            "to": to,
            "due": cv.get("date_mm22kzfc"),
            "status": cv.get("project_status"),
            "updated_at": (it.get("updated_at") or "")[:10] or None,
        })
    clients = []
    for name, items in buckets.items():
        items.sort(key=lambda x: x["from"])
        clients.append({"client": name, "items": items})
    clients.sort(key=lambda c: (-len(c["items"]), c["client"]))
    return {"clients": clients}


def sprint_health(reliability, carryover, committed):
    # green = reliable + low carryover; red = badly under-delivered
    if reliability is None:
        return "unknown"
    if reliability >= 85 and (committed == 0 or carryover / committed <= 0.15):
        return "green"
    if reliability >= 60:
        return "amber"
    return "red"


def build_velocity(internal_raw, today):
    completed, committed = {}, {}
    throughput = {}
    owner_done, owner_committed = {}, {}
    sprint_titles = {}
    backlog_points = 0

    for it in internal_raw.get("items", []):
        cv = it.get("column_values", {})
        grp = it.get("group") or {}
        pts = points(cv)
        if grp.get("id") == BACKLOG_GROUP:
            if cv.get("project_status") != "Done":
                backlog_points += pts
            continue
        sn = sprint_num(cv)
        if sn is None:
            continue
        is_done = grp.get("id") == DONE_GROUP or cv.get("project_status") == "Done"
        if grp.get("title") and ("Sprint %d" % sn) in (grp.get("title") or ""):
            sprint_titles[sn] = grp.get("title")
        committed[sn] = committed.get(sn, 0) + pts
        own = short_owner(cv.get("project_owner")) or "Unassigned"
        owner_committed.setdefault(sn, {})
        owner_done.setdefault(sn, {})
        owner_committed[sn][own] = owner_committed[sn].get(own, 0) + pts
        if is_done:
            completed[sn] = completed.get(sn, 0) + pts
            throughput[sn] = throughput.get(sn, 0) + 1
            owner_done[sn][own] = owner_done[sn].get(own, 0) + pts

    for sn, c in SEED_COMMITTED.items():
        committed[sn] = max(committed.get(sn, 0), c)

    history = []
    for sn in sorted(set(completed) | set(committed)):
        comm = committed.get(sn, 0)
        comp = completed.get(sn, 0)
        carry = max(comm - comp, 0)
        rel = round(comp / comm * 100) if comm else None
        by_owner = {}
        for own in set(owner_committed.get(sn, {})) | set(owner_done.get(sn, {})):
            by_owner[own] = {
                "committed": owner_committed.get(sn, {}).get(own, 0),
                "completed": owner_done.get(sn, {}).get(own, 0),
            }
        history.append({
            "sprint": sn,
            "committed": comm,
            "completed": comp,
            "carryover": carry,
            "reliability": rel,
            "throughput": throughput.get(sn, 0),
            "health": sprint_health(rel, carry, comm),
            "by_owner": by_owner,
        })

    # rolling average + band over the last 3 sprints' completed points
    recent = [h["completed"] for h in history[-3:]] or [0]
    rolling_avg = round(sum(recent) / len(recent), 1)
    band = {"min": min(recent), "max": max(recent)}

    # forecast: sprints to clear the remaining backlog at the velocity range
    forecast = None
    if backlog_points > 0 and band["max"] > 0:
        import math
        low = math.ceil(backlog_points / band["max"])   # optimistic (fast) -> fewer sprints
        high = math.ceil(backlog_points / band["min"]) if band["min"] > 0 else None
        mid = math.ceil(backlog_points / rolling_avg) if rolling_avg > 0 else None
        forecast = {"backlog_points": backlog_points, "low_sprints": low,
                    "high_sprints": high, "mid_sprints": mid}

    # current sprint window from the sprint-backlog group title "(Jun 15 - Jul 18)"
    cur = max((h["sprint"] for h in history), default=None)
    current = None
    if cur is not None:
        start = end = span = day = None
        status = "active"
        m = re.search(r"\(([^)]+)\)", sprint_titles.get(cur, ""))
        if m:
            try:
                a, b = m.group(1).split(" - ")
                yr = today.year
                start = datetime.strptime("%s %d" % (a.strip(), yr), "%b %d %Y").date()
                end = datetime.strptime("%s %d" % (b.strip(), yr), "%b %d %Y").date()
                span = (end - start).days + 1
                day = max(1, min((today - start).days + 1, span))
                if today > end:
                    status = "closed"
            except ValueError:
                pass
        current = {"number": cur, "goal": SPRINT_GOAL,
                   "start": start.isoformat() if start else None,
                   "end": end.isoformat() if end else None,
                   "span": span, "day": day, "status": status}

    return {"current_sprint": current, "history": history,
            "rolling_avg": rolling_avg, "band": band,
            "backlog_points": backlog_points, "forecast": forecast,
            "target": {"low": TARGET_LOW, "high": TARGET_HIGH, "team": TEAM_SIZE}}


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
    for c in out["gantt"]["clients"]:
        print("  %-18s %d items" % (c["client"], len(c["items"])))
    for h in v["history"]:
        print("  Sprint %d: %d/%d done/committed  rel=%s%%  carry=%d  thru=%d  %s"
              % (h["sprint"], h["completed"], h["committed"], h["reliability"],
                 h["carryover"], h["throughput"], h["health"]))
    print("  rolling_avg=%s band=%s backlog=%d forecast=%s"
          % (v["rolling_avg"], v["band"], v["backlog_points"], v["forecast"]))


if __name__ == "__main__":
    sys.exit(main())
