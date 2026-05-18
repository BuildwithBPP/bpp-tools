# BPP Tools Hub — Restructure Design Spec

**Date:** 2026-05-17
**Author:** Daunte (with Claude)
**Status:** Draft — pending in-flight content inputs before finalize
**Repo:** `BuildwithBPP/bpp-tools` (deploys via GitHub Pages from `main`)

---

## 1. Problem

The Hub grew organically without a navigation plan. Today it has **10 top tabs** and
**14 quick-link cards** on the home page, with overlap and no clear organizing
principle. It is not intuitive — the team is still learning what the Hub even is.
It needs to be reorganized into something clear, fast to navigate, and durable as
BPP grows.

## 2. Goals

The Hub has two jobs and must serve both without burying either:

1. **Business health at a glance** — land on it and immediately see how BPP is doing
   (cash, AR, active clients, who's on what, what's new).
2. **An organized directory of everything BPP** — a fast, well-structured reference
   for playbooks, pricing, ICP, reviews, org structure, builds, AI tooling — anything
   the team needs to find quickly.

Non-goals for this pass are listed in Section 11.

## 3. Chosen Approach — "Department Spine + Quick Actions"

Selected from three options (Three Doors / Department Spine / One Directory). The
department spine wins because:

- It matches the **ratified org chart** (2026-05-06) — every page gets a DRI owner,
  no orphan content.
- It sets up the **"contractors soon"** plan cleanly — a contractor can be pointed at
  one department page.
- A **Quick Actions** strip on the home page covers the "what am I doing right now"
  view without adding tabs.
- It can later absorb a By-Department / By-Workflow toggle if the team wants it.

## 4. Navigation

Top nav drops from **10 tabs → 4**:

```
[B] BPP Tools    Home  ·  Departments  ·  Library  ·  Strategy        [Daunte][Kenny][Eli]
```

- The person-switcher (`data-person` body attribute) and logo are unchanged.
- Every sub-page keeps the back-button bar and `css/styles.css`.
- No iframes — direct links only (existing rule).
- Nav tab styling reuses existing `.hub-nav` / `.hub-tab` classes.

## 5. Home — business health at a glance

Keep all existing dashboard content:
- Stat cards (cash, AR, active clients, pipeline)
- AR forecast scenarios
- Active clients grid
- Who's On What
- What's New banner
- Operating Norms strip

**Add:** a **Quick Actions** strip near the top of the page — 4 buttons that
deep-link into the most common moments:

| Action | Destination |
|---|---|
| Prep a discovery call | Sales & BD → pre-call |
| Qualify a lead | Sales & BD → ICP profiles |
| Onboard a client | Client Delivery & Design → kickoff |
| Run the monthly / quarterly review | Strategy → reviews |

**Contractor-readiness:** the AR forecast and cash blocks get wrapped in a
gate-able container (same pattern as the existing person-switcher) so a future
contractor view can hide sensitive financials without a rebuild. Not built now —
just structured so it is a CSS/attribute toggle later.

## 6. Departments — the organizing spine

A `Departments` landing page presents **6 tiles**, each opening one department page.

| Department | DRI |
|---|---|
| Sales & BD | Kenny |
| Marketing & Content | Kenny |
| Finance & Operations | Daunte |
| Client Delivery & Design | Eli |
| AI Workforce & Tech | Daunte |
| HR & People | Parked — placeholder page, owner TBD |

Every department page uses **one shared template** so they are consistent and
predictable:

1. **Header** — department name, DRI, collaborators (from the org chart)
2. **What this department owns** — one line
3. **Playbooks & workflows** — the how-to pages
4. **Tools & links** — external tools filtered to that department (Monday, HubSpot,
   QuickBooks, etc.)
5. **Reference** — department-specific docs
6. **AI agents** — that department's skills/agents (per the "AI per dept" norm —
   framework is central, agents are owned by the dept they serve)

HR & People is **parked** — its page is a labeled placeholder until the role is
filled, holding the existing survey artifacts as an archive.

## 7. Library — the fast directory

Every reference doc has **exactly one canonical home** (a department page or
Strategy). The Library is a single **index** of everything, grouped by type — it is
a *view*, not a second copy of the content.

Library groupings:
- Playbooks
- Pricing & ICP
- Dashboards
- Reference docs
- What We've Built
- Skill Dictionary

This is the "go to things fast" surface — a complete catalog with one click to
anything in the Hub.

## 8. Strategy — where BPP is going

Holds the forward-looking and operating-model content:
- Strategic Plan 2026–2027
- Operating Model Synthesis (ratified accountability chart + decisions)
- Org chart / Team & AI Workforce
- Reviews & KPIs (monthly + quarterly, incl. Q1 dashboards)

## 9. Content map — first pass

Every current page mapped to its new home. Review and correct when in-flight
content is ready.

| Current page | New home |
|---|---|
| `index.html` (dashboard) | **Home** |
| `pre-call.html` | Sales & BD |
| `icp-profiles.html` | Sales & BD |
| `service-packages.html` | Sales & BD |
| `marketing.html` | Marketing & Content |
| `content-dashboard.html` | Marketing & Content |
| `finance.html` | Finance & Operations |
| `ops.html` | Finance & Operations |
| `kickoff.html` | Client Delivery & Design |
| `delivery-playbook.html` | Client Delivery & Design |
| `skill-dictionary.html` | AI Workforce & Tech |
| `systems.html` | AI Workforce & Tech |
| `data-source-map.html` | AI Workforce & Tech |
| `builds.html` ("What We've Built") | **Library** (cross-dept showcase) |
| `strategic-plan.html` | Strategy |
| `synthesis.html` | Strategy |
| `team.html` | Strategy |
| `reviews.html` | Strategy (Reviews) |
| `q1-2026-dashboard.html` / `q1-2026-agenda.html` / `q1-2026-prep.md` | Strategy (Reviews) |
| `bpp-roles-survey.html` / `rodney-feedback-survey.html` / `survey-responses.html` | HR & People (archive) |

Every reference doc also appears in the Library index regardless of its canonical
home.

## 10. Pending Inputs — flagged gaps

Daunte is building additional content. These slots are open and must be filled
before the restructure is finalized and pushed to production:

- **Business plan** — likely a new page under Strategy. *(Daunte to confirm scope
  and final placement.)*
- **Other in-flight builds** — not yet named. *(Daunte to enumerate and place.)*

> **This spec is not final until this section is resolved.** The structure
> (Sections 4–8) is locked; the content map (Section 9) is provisional pending
> these inputs.

## 11. Design & Build Approach

- **Theme:** BPP brand — navy `#044771`, gold `#F1BE5C`, steel `#5987A5`; fonts
  Poppins / Montserrat / Merriweather. Reuse `css/styles.css` tokens.
- **Tooling:** use the available design tooling — Google Stitch, the
  `html-page-builder` skill (loads the BPP theme), the `frontend-design` skill for
  polish, and the design MCPs — to make the Hub genuinely easy to navigate and
  nice-looking, not just functional.
- **Quality gate:** screenshot-review every page before calling it done (per the
  screenshot-UI-review norm). Building UI without visually checking it ships broken
  layouts.
- **Build on a branch:** all restructure work happens on a feature branch. Because
  GitHub Pages auto-deploys from `main`, nothing reaches production until the
  branch is merged — which does not happen until Section 10 is resolved.

## 12. Out of Scope (this pass)

- Building the actual contractor view (only structuring for it).
- Dynamic/auto-refreshed data beyond what already exists (`hub-home-stats.json`).
- The By-Department / By-Workflow toggle (a possible future enhancement).
- Rewriting page *content* — this pass restructures navigation and placement, not
  the substance of existing pages.

## 13. Success Criteria

- Top nav has 4 items; no page is more than 2 clicks from Home.
- Every page has a single canonical department/Strategy home and a DRI.
- Every reference doc is reachable from the Library index.
- Home shows business health + Quick Actions above the fold.
- Sensitive financials are wrapped for future gating.
- Every page is screenshot-reviewed and on-brand before merge.
