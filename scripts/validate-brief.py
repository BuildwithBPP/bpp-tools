#!/usr/bin/env python3
"""validate-brief.py - poka-yoke for the Monday brief.

Run this BEFORE committing a regenerated brief or an edited ops.html:

    python3 scripts/validate-brief.py

Why this exists: the schema doc in the bpp-monday-prep skill said one thing and the
page read another for months, silently. `clients_at_risk` rendered as a bold name and a
dangling em-dash because the page read `flag_reason` while the generator emitted `reason`.
Six more fields the page read had quietly stopped being emitted. Prose schema docs did not
catch any of it. This does, in about a second.

It checks three contracts:
  1. DOM     - every id the page's JS touches unguarded actually exists in the markup
  2. Recap   - the selectors collectRecapPayload() depends on all survive
  3. Schema  - lanes[] is well-formed and the fields the page reads are emitted

Exit 0 = safe to commit. Exit 1 = something will break at runtime.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPS = os.path.join(ROOT, "pages", "ops.html")
BRIEF = os.path.join(ROOT, "data", "monday-prep-latest.json")
HOME = os.path.join(ROOT, "data", "hub-home-stats.json")

# The Scorecard panel legitimately uses 2 colspans. Any more means someone added one to a
# table js/nav.js post-processes for mobile, which downgrades it to horizontal scroll.
COLSPAN_BASELINE = 2

RECAP_IDS = [
    "voice-update-text", "dec-list", "park-list", "brief-prior-decisions",
    "recap-modal", "recap-text", "mtg-book-list", "deep-dive-notes",
    "lane-scan", "deep-dive-wrap",
] + ["commit-%s-%s" % (p, s) for p in "dke" for s in ("strat", "op", "unblock")]

RECAP_CLASSES = ["dec-text", "dec-own", "dec-due", "mtg-row", "mtg-topic", "mtg-who", "mtg-when"]

LANE_KEYS = ("key", "name", "short_name", "dri", "dri_code", "health", "headline", "decision", "evidence")
HEALTH = ("green", "amber", "red", "unknown")
ROUTING = ("over_2k", "blocks_revenue", "dri_call", "none")
# The ratified department chart (team-roles.md, 2026-05-06). HR is parked.
RATIFIED = {"sales", "marketing", "finance", "client_delivery", "ai_workforce", "hr"}
DRIS = {"Daunte", "Kenny", "Eli"}


def main():
    fail, warn = [], []
    html = open(OPS).read()
    js = "\n".join(re.findall(r"<script>(.*?)</script>", html, re.S))
    body = re.sub(r"<script>.*?</script>", "", html, flags=re.S)
    ids = set(re.findall(r'id="([^"]+)"', body))
    classes = {w for m in re.findall(r'class="([^"]+)"', body) for w in m.split()}

    # -- 1. DOM contract: an unguarded getElementById on a deleted node throws and
    #       aborts renderBrief() halfway, leaving the page half-populated.
    pairs = re.findall(r"var\s+(\w+)\s*=\s*document\.getElementById\(['\"]([^'\"]+)['\"]\)", js)
    guarded = {i for v, i in pairs if re.search(r"if\s*\(\s*!?%s\b" % re.escape(v), js)}
    refs = (set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js))
            | set(re.findall(r"setText\(['\"]([^'\"]+)['\"]", js)))
    missing = sorted(r for r in refs if r not in ids and r not in guarded)
    if missing:
        fail.append("unguarded JS refs to missing ids (will throw): %s" % missing)
    soft = sorted(r for r in refs if r not in ids and r in guarded)
    if soft:
        warn.append("guarded refs to absent ids (safe): %s" % soft)

    # -- 2. Recap contract
    for i in RECAP_IDS:
        if i not in ids:
            fail.append("missing recap contract id: #%s" % i)
    for c in RECAP_CLASSES:
        if c not in classes and c not in js:
            fail.append("missing recap contract class: .%s" % c)

    m = re.search(r"function addDec\(\)\s*\{(.*?)\n\}", js, re.S)
    if not m:
        fail.append("addDec() not found")
    else:
        for c in ("dec-text", "dec-own", "dec-due"):
            if c not in m.group(1):
                fail.append("addDec() builds a row missing .%s - added decisions lose that field" % c)

    n = body.count("colspan")
    if n > COLSPAN_BASELINE:
        fail.append("new colspan introduced (%d vs %d baseline) - nav.js mobile stacking breaks"
                    % (n, COLSPAN_BASELINE))

    # -- 3. Schema
    d = json.load(open(BRIEF))
    lanes = d.get("lanes") or []
    if not lanes:
        fail.append("no lanes[] - the brief predates the executive format")
    for l in lanes:
        for k in LANE_KEYS:
            if k not in l:
                fail.append("lane %s missing %s" % (l.get("key", "?"), k))
        if l.get("key") not in RATIFIED:
            fail.append("lane %r is not in the ratified department chart" % l.get("key"))
        if l.get("dri") not in DRIS:
            fail.append("lane %s has DRI %r, not one of %s" % (l.get("key"), l.get("dri"), sorted(DRIS)))
        if l.get("health") not in HEALTH:
            fail.append("lane %s health %r not in %s" % (l.get("key"), l.get("health"), list(HEALTH)))
        if (l.get("decision") or {}).get("routing") not in ROUTING:
            fail.append("lane %s routing not in %s" % (l.get("key"), list(ROUTING)))
        # The anti-status-dump rule lives here, not in prose.
        if len(l.get("watching") or []) > 3:
            fail.append("lane %s has >3 watching items - that is a status dump, not a scan" % l.get("key"))
        # Data honesty: a quiet lane must be loud, never absent.
        if l.get("silent_weeks", 0) >= 2 and l.get("health") == "green":
            fail.append("lane %s is %d weeks silent but renders green" % (l.get("key"), l["silent_weeks"]))

    keys = [l.get("key") for l in lanes]
    if len(set(keys)) != len(keys):
        fail.append("duplicate lane keys: %s" % keys)
    dd = d.get("deep_dive") or {}
    if dd and dd.get("lane_key") not in set(keys):
        fail.append("deep_dive.lane_key %r matches no lane" % dd.get("lane_key"))

    # Fields ops.html reads. Absent = a silent blank on the page.
    for k in ("week_of", "week_of_prior", "stale_flags", "meeting_format", "meetings_to_book", "deep_dive"):
        if not d.get(k):
            fail.append("%s not emitted - ops.html reads it" % k)
    if "savings_pct_to_phase2" not in (d.get("cash") or {}):
        fail.append("cash.savings_pct_to_phase2 not emitted - ops.html reads it")
    for c in d.get("clients_at_risk") or []:
        if not (c.get("reason") or c.get("flag_reason")):
            fail.append("clients_at_risk entry %r has neither reason nor flag_reason" % c.get("name"))

    # index.html renderHomeStats() bails on `if (!d || !d.stats) return;`
    if "stats" not in json.load(open(HOME)):
        fail.append("hub-home-stats.json lost its stats object - index.html would silently blank")

    print("ids %d | js refs %d | lanes %d | meetings %d"
          % (len(ids), len(refs), len(lanes), len(d.get("meetings_to_book") or [])))
    for w in warn:
        print("  ~ %s" % w)
    if fail:
        print("\nFAILURES (%d):" % len(fail))
        for f in fail:
            print("  x %s" % f)
        return 1
    print("\nALL CHECKS PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
