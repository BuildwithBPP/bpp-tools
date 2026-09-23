#!/usr/bin/env python3
"""Refresh the "auto" half of data/scoreboard.json from HubSpot.

Runs in GitHub Actions (.github/workflows/scoreboard-refresh.yml) every Sunday and
Wednesday, and by hand with:

    HUBSPOT_TOKEN=... python scripts/scoreboard/refresh_scoreboard.py [--dry-run]

Rules:
- Only data/scoreboard.json -> "auto" is rewritten. "_about" and "manual" are kept as-is.
- HubSpot is read-only here: every call is a GET or a search.
- If any call fails or the result looks impossible, nothing is written and the
  script exits non-zero with the raw HubSpot error (status + first 500 chars).

Needs a HubSpot private app token with read scopes:
crm.objects.deals.read, crm.objects.owners.read, crm.objects.contacts.read,
crm.schemas.deals.read (meetings + tasks are read through the contacts scope).
Standard library only, so the Action needs no pip install.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, time as dtime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
API = "https://api.hubapi.com"
ROOT = Path(__file__).resolve().parents[2]
DATA_FILE = ROOT / "data" / "scoreboard.json"
HISTORY_START = date(2025, 6, 1)

# Fallback labels if the pipeline endpoint is not readable with the token's scopes.
STAGE_FALLBACK = {
    "1295637184": "Lead Captured", "1295637185": "Discovery Scheduled", "1886305995": "Qualified & Working",
    "1295637186": "Proposal Sent", "1295637189": "Negotiation", "1886305996": "Verbal Commitment",
    "1295637190": "Contract Signed", "1390547646": "Closed Won", "1295637191": "Deal Lost",
}
# Named owners, matched on full name. An active owner with a blank name is Josue (team-confirmed 9/23).
OWNER_NAMES = {"eli fisher": "Eli", "kenny hawkins": "Kenny", "daunte benjamin": "Daunte",
               "rodney jones": "Rodney", "admin bpp": "Admin"}
TRACKED_OWNERS = ["Kenny", "Daunte", "Josue", "Eli", "Rodney"]
SALES_CALL = re.compile(r"discovery|intro|demo|consult|strategy call|sales call", re.I)
NOT_SALES = re.compile(r"kickoff|review|training|internal|standup|business meeting|check in", re.I)


class HubSpotError(RuntimeError):
    pass


def call(token: str, method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            raw = e.read().decode(errors="replace")
            if e.code == 429 and attempt < 3:      # search API allows ~5 req/s
                time.sleep(2 * (attempt + 1))
                continue
            raise HubSpotError(f"{method} {path} -> HTTP {e.code}: {raw[:500]}") from None
    raise HubSpotError(f"{method} {path} -> rate limited 4 times")


def search_all(token: str, obj: str, filter_groups: list, props: list[str]) -> list[dict]:
    out, after = [], None
    while True:
        body = {"filterGroups": filter_groups, "properties": props, "limit": 200}
        if after:
            body["after"] = after
        res = call(token, "POST", f"/crm/v3/objects/{obj}/search", body)
        out.extend(res.get("results", []))
        after = res.get("paging", {}).get("next", {}).get("after")
        time.sleep(0.25)
        if not after:
            return out


def search_total(token: str, obj: str, filters: list) -> int:
    res = call(token, "POST", f"/crm/v3/objects/{obj}/search",
               {"filterGroups": [{"filters": filters}], "properties": ["hs_object_id"], "limit": 1})
    time.sleep(0.25)
    return int(res.get("total", 0))


def ms(d: datetime) -> str:
    return str(int(d.timestamp() * 1000))


def et_day_start(d: date) -> datetime:
    return datetime.combine(d, dtime.min, tzinfo=ET)


def to_et_date(value: str | None) -> str | None:
    """HubSpot sends UTC ISO strings (or epoch ms). Return the America/New_York calendar date."""
    if not value:
        return None
    if value.isdigit():
        dt = datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
    else:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt.astimezone(ET).date().isoformat()


def clean_name(n: str | None) -> str:
    n = re.sub(r"\s+", " ", (n or "").strip())
    return re.sub(r"\s*-\s*New Deal$", "", n, flags=re.I)


def is_test(n: str | None) -> bool:
    return (n or "").strip().lower() == "test"


def num(v) -> float:
    try:
        return round(float(v), 2) if v not in (None, "") else 0
    except ValueError:
        return 0


def owner_map(token: str) -> dict[str, str]:
    res = call(token, "GET", "/crm/v3/owners?limit=100&archived=false")
    out = {}
    for o in res.get("results", []):
        full = f"{o.get('firstName') or ''} {o.get('lastName') or ''}".strip()
        name = OWNER_NAMES.get(full.lower()) or (full.split(" ")[0] if full else "Josue")
        out[str(o["id"])] = name
    return out


def stage_map(token: str) -> dict[str, str]:
    try:
        res = call(token, "GET", "/crm/v3/pipelines/deals")
        m = {s["id"]: s["label"] for p in res.get("results", []) for s in p.get("stages", [])}
        return {**STAGE_FALLBACK, **m}
    except HubSpotError as e:
        print(f"note: pipeline labels unavailable, using fallback ({e})", file=sys.stderr)
        return STAGE_FALLBACK


def short_list(items: list[str], limit: int = 4) -> str:
    return ", ".join(items[:limit]) + (f" +{len(items) - limit} more" if len(items) > limit else "")


def build_auto(token: str, today: date) -> dict:
    owners = owner_map(token)
    stages = stage_map(token)
    oname = lambda oid: owners.get(str(oid or ""), "")
    week_from, week_to = today - timedelta(days=7), today - timedelta(days=1)
    w0, w1 = et_day_start(week_from), et_day_start(today)
    hist = et_day_start(HISTORY_START)

    # Closed deals since June 2025 (plus closed deals missing a close date).
    dprops = ["dealname", "amount", "hubspot_owner_id", "closedate", "createdate",
              "hs_is_closed_won", "closed_lost_reason", "hs_lastmodifieddate"]
    closed = search_all(token, "deals", [
        {"filters": [{"propertyName": "hs_is_closed", "operator": "EQ", "value": "true"},
                     {"propertyName": "closedate", "operator": "GTE", "value": ms(hist)}]},
        {"filters": [{"propertyName": "hs_is_closed", "operator": "EQ", "value": "true"},
                     {"propertyName": "closedate", "operator": "NOT_HAS_PROPERTY"},
                     {"propertyName": "createdate", "operator": "GTE", "value": ms(hist)}]},
    ], dprops)
    deals, seen = [], set()
    for r in closed:
        p = r["properties"]
        if is_test(p.get("dealname")) or r["id"] in seen:
            continue
        seen.add(r["id"])
        won = p.get("hs_is_closed_won") == "true"
        d = {"id": str(r["id"]), "n": clean_name(p.get("dealname")), "a": num(p.get("amount")),
             "o": oname(p.get("hubspot_owner_id")),
             "close": to_et_date(p.get("closedate")) or to_et_date(p.get("hs_lastmodifieddate")),
             "w": 1 if won else 0}
        if not won:
            d["reasons"] = [x.strip() for x in (p.get("closed_lost_reason") or "").split(";") if x.strip()]
        deals.append(d)
    deals.sort(key=lambda d: d["close"] or "")

    # Open pipeline.
    open_rows = search_all(token, "deals", [{"filters": [
        {"propertyName": "hs_is_closed", "operator": "EQ", "value": "false"}]}],
        ["dealname", "amount", "hubspot_owner_id", "dealstage", "closedate",
         "notes_last_contacted", "notes_next_activity_date", "closed_lost_reason"])
    pipeline = []
    for r in open_rows:
        p = r["properties"]
        if is_test(p.get("dealname")):
            continue
        pipeline.append({"id": str(r["id"]), "n": clean_name(p.get("dealname")),
                         "o": oname(p.get("hubspot_owner_id")),
                         "stage": stages.get(p.get("dealstage") or "", p.get("dealstage") or ""),
                         "a": num(p.get("amount")), "last": to_et_date(p.get("notes_last_contacted")),
                         "nextDate": to_et_date(p.get("notes_next_activity_date")),
                         "close": to_et_date(p.get("closedate")),
                         "lostReasonSet": bool((p.get("closed_lost_reason") or "").strip())})
    pipeline.sort(key=lambda p: -p["a"])

    # Sales calls held last week.
    meetings = search_all(token, "meetings", [{"filters": [
        {"propertyName": "hs_timestamp", "operator": "GTE", "value": ms(w0)},
        {"propertyName": "hs_timestamp", "operator": "LT", "value": ms(w1)}]}],
        ["hs_meeting_title", "hs_timestamp", "hubspot_owner_id"])
    calls = []
    for m in sorted(meetings, key=lambda m: m["properties"].get("hs_timestamp") or ""):
        p = m["properties"]
        t = (p.get("hs_meeting_title") or "").strip()
        if SALES_CALL.search(t) and not NOT_SALES.search(t):
            d = to_et_date(p.get("hs_timestamp"))
            md = f"{int(d[5:7])}/{int(d[8:10])}" if d else "?"
            calls.append(f"{t} ({md}, {oname(p.get('hubspot_owner_id')) or 'no owner'})")

    # Deals opened last week.
    new_rows = search_all(token, "deals", [{"filters": [
        {"propertyName": "createdate", "operator": "GTE", "value": ms(w0)},
        {"propertyName": "createdate", "operator": "LT", "value": ms(w1)}]}], ["dealname"])
    new_names = [clean_name(r["properties"].get("dealname")) for r in new_rows
                 if not is_test(r["properties"].get("dealname"))]

    # New people reached last week, per person: contacts whose owner logged their first
    # call, email or meeting with them in the window (HubSpot's "Date of first engagement").
    # Clients are skipped so delivery email doesn't count as outreach.
    reached_rows = search_all(token, "contacts", [{"filters": [
        {"propertyName": "hs_sa_first_engagement_date", "operator": "GTE", "value": ms(w0)},
        {"propertyName": "hs_sa_first_engagement_date", "operator": "LT", "value": ms(w1)}]}],
        ["firstname", "lastname", "company", "hubspot_owner_id", "lifecyclestage"])
    reached: dict[str, list[str]] = {}
    for r in reached_rows:
        p = r["properties"]
        if (p.get("lifecyclestage") or "") == "customer":
            continue
        who = oname(p.get("hubspot_owner_id")) or "No owner"
        label = (p.get("company") or " ".join(x for x in (p.get("firstname"), p.get("lastname")) if x) or "unnamed").strip()
        reached.setdefault(who, []).append(label)
    outreach = {who: {"v": len(v), "d": short_list(sorted(v))} for who, v in reached.items()}

    # Overdue follow-up tasks, total and by owner.
    base = [{"propertyName": "hs_task_status", "operator": "NEQ", "value": "COMPLETED"},
            {"propertyName": "hs_timestamp", "operator": "LT", "value": ms(w1)}]
    total = search_total(token, "tasks", base)
    by_owner = []
    for name in TRACKED_OWNERS:
        ids = [oid for oid, n in owners.items() if n == name]
        c = sum(search_total(token, "tasks", base + [
            {"propertyName": "hubspot_owner_id", "operator": "EQ", "value": oid}]) for oid in ids)
        if c:
            by_owner.append([name, c])
    rest = total - sum(c for _, c in by_owner)
    if rest > 0:
        by_owner.append(["Admin / auto-created", rest])
    by_owner.sort(key=lambda x: -x[1])

    return {
        "asOf": today.isoformat(),
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "by": "GitHub Action (HubSpot API)",
        "week": {"from": week_from.isoformat(), "to": week_to.isoformat()},
        "deals": deals,
        "pipeline": pipeline,
        "activity": {
            "salesCalls": {"v": len(calls), "d": short_list(calls) or "None logged in HubSpot this week"},
            "newDeals": {"v": len(new_names), "d": short_list(new_names) or "No new deals opened this week"},
        },
        "outreach": outreach,
        "overdue": {"total": total, "byOwner": by_owner},
    }


def validate(auto: dict) -> None:
    problems = []
    if len(auto["deals"]) <= 20:
        problems.append(f"only {len(auto['deals'])} closed deals since {HISTORY_START} (expected 60+)")
    for d in auto["deals"]:
        if not all(k in d for k in ("id", "n", "a", "o", "close", "w")) or not d["close"]:
            problems.append(f"incomplete deal record: {d}")
            break
    if problems:
        raise SystemExit("Refusing to write scoreboard.json: " + "; ".join(problems))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="Print a summary, do not write the file.")
    args = ap.parse_args()
    token = os.environ.get("HUBSPOT_TOKEN")
    if not token:
        raise SystemExit("HUBSPOT_TOKEN is not set. Add it as a repo secret (gh secret set HUBSPOT_TOKEN).")

    doc = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    today = datetime.now(ET).date()
    try:
        auto = build_auto(token, today)
    except HubSpotError as e:
        raise SystemExit(f"HubSpot call failed, nothing written.\n{e}")
    validate(auto)

    won_q = [d for d in auto["deals"] if d["w"] == 1 and d["close"] >= date(today.year, 3 * ((today.month - 1) // 3) + 1, 1).isoformat()]
    print(f"asOf {auto['asOf']}: {len(auto['deals'])} closed deals, {len(won_q)} won this quarter "
          f"(${sum(d['a'] for d in won_q):,.0f}), open pipeline ${sum(p['a'] for p in auto['pipeline']):,.0f} "
          f"across {len(auto['pipeline'])} deals, {auto['overdue']['total']} overdue tasks, "
          f"{auto['activity']['salesCalls']['v']} sales calls + {auto['activity']['newDeals']['v']} new deals + "
          f"{sum(o['v'] for o in auto['outreach'].values())} new people reached last week")
    if args.dry_run:
        return
    out = {"_about": doc.get("_about", ""), "auto": auto, "manual": doc["manual"]}
    DATA_FILE.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
