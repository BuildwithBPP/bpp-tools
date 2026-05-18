# BPP Tools Hub Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the BPP Tools Hub from 10 flat nav tabs into a 4-tab Department-Spine layout (Home · Departments · Library · Strategy) that is clear, fast to navigate, and on-brand.

**Architecture:** Static HTML site on GitHub Pages. A new shared `js/nav.js` injects the 4-tab nav into every page (eliminating per-page nav duplication). Six department pages built from one shared HTML skeleton. A Library index and a Strategy landing page added. The existing topic pages keep their content and become children linked from department pages and the Library.

**Tech Stack:** Plain HTML/CSS/JS, no build step. BPP theme tokens in `css/styles.css` (navy `#044771`, gold `#F1BE5C`, steel `#5987A5`; Poppins/Montserrat/Merriweather). Page polish via the `frontend-design` and `html-page-builder` skills.

**Source spec:** `docs/specs/2026-05-17-hub-restructure-design.md`

**Branch:** All work on `hub-restructure`. Do NOT merge to `main` — production push is gated on Daunte's explicit go (spec §10).

**Verification model:** This is a static site with no test framework. Each page task ends with a **visual review step**: open the page in a browser, screenshot it, and check it against the task's review checklist (per the screenshot-UI-review norm). A page is not "done" until it has been seen.

---

## File Structure

**Create:**
- `js/nav.js` — shared 4-tab nav component (injects nav, handles active state + person-switcher + relative paths)
- `pages/departments.html` — Departments landing (6 tiles)
- `pages/dept-sales.html` — Sales & BD department page
- `pages/dept-marketing.html` — Marketing & Content department page
- `pages/dept-finance-ops.html` — Finance & Operations department page
- `pages/dept-delivery.html` — Client Delivery & Design department page
- `pages/dept-ai-tech.html` — AI Workforce & Tech department page
- `pages/dept-hr.html` — HR & People department page (parked placeholder)
- `pages/library.html` — Library index
- `pages/strategy.html` — Strategy landing
- `pages/business-plan.html` — Business Plan page (placeholder slot, spec §10)

**Modify:**
- `css/styles.css` — add component styles (nav unchanged class names; new: quick-actions, dept-tiles, dept-page sections, library-index)
- `index.html` — swap to `nav.js`, add Quick Actions strip
- All hub-native pages — swap hard-coded nav to `nav.js` include: `strategic-plan.html`, `builds.html`, `ops.html`, `reviews.html`, `systems.html`, `marketing.html`, `finance.html`, `kickoff.html`, `pre-call.html`
- Standalone pages — add `nav.js` for consistency: `team.html`, `q1-2026-agenda.html`, `q1-2026-dashboard.html`, `skill-dictionary.html`, `data-source-map.html`, `delivery-playbook.html`, `icp-profiles.html`, `service-packages.html`, `content-dashboard.html`, `synthesis.html`

**Reference data (no decisions left — use exactly):**

Quick Actions (Home): Prep a discovery call → `pages/pre-call.html` · Qualify a lead → `pages/icp-profiles.html` · Onboard a client → `pages/kickoff.html` · Run the monthly/quarterly review → `pages/reviews.html`

Department pages and their content:

| Dept page | DRI | Owns (1 line) | Playbooks & workflows | Tools & links | Reference | AI agents |
|---|---|---|---|---|---|---|
| `dept-sales.html` Sales & BD | Kenny | Pipeline, lead distribution, discovery, deal admin | Pre-Call Prep (`pre-call.html`) | HubSpot CRM (`https://app.hubspot.com`) | ICP Profiles (`icp-profiles.html`), Service Packages (`service-packages.html`) | discovery-call-prep skill |
| `dept-marketing.html` Marketing & Content | Kenny | Strategy, social, newsletter, blog, brand voice | Marketing (`marketing.html`) | Content Dashboard (`content-dashboard.html`) | — | draft-newsletter, linkedin-engagement, youtube-seo skills |
| `dept-finance-ops.html` Finance & Operations | Daunte | QB, AR, tax, KPI dashboards, sprint cadence, Monday boards | Finance (`finance.html`), Ops (`ops.html`) | QuickBooks (`https://app.qbo.intuit.com`), Operations Board (`https://businessplansplus.monday.com/boards/18406003425`) | — | bpp-monday-prep skill |
| `dept-delivery.html` Client Delivery & Design | Eli | Onboarding, timeline, weekly status, deliverable design | Kickoff (`kickoff.html`), Delivery Playbook (`delivery-playbook.html`) | Client Projects Board (`https://businessplansplus.monday.com/boards/18406004595`) | — | — |
| `dept-ai-tech.html` AI Workforce & Tech | Daunte | AI plugins, MCPs, automations, Hub builds | Systems (`systems.html`) | Data Source Map (`data-source-map.html`) | Skill Dictionary (`skill-dictionary.html`), What We've Built (`builds.html`) | **Meeting-summary skill — placeholder card, "Coming soon" (spec §10)** |
| `dept-hr.html` HR & People | Parked | People ops, contracts, hiring — role not yet filled | — | — | Survey archive: `bpp-roles-survey.html`, `rodney-feedback-survey.html`, `survey-responses.html` | — |

Library index groups: **Playbooks** — `delivery-playbook.html` · **Pricing & ICP** — `service-packages.html`, `icp-profiles.html` · **Dashboards** — `content-dashboard.html`, `q1-2026-dashboard.html` · **Reference** — `data-source-map.html`, `finance.html`, `ops.html`, `systems.html`, `marketing.html` · **What We've Built** — `builds.html` · **Skill Dictionary** — `skill-dictionary.html`

Strategy landing links: Strategic Plan (`strategic-plan.html`), Business Plan (`business-plan.html`), Operating Model Synthesis (`synthesis.html`), Org Chart / Team (`team.html`), Reviews & KPIs (`reviews.html`), Q1 Dashboard (`q1-2026-dashboard.html`), Q1 Agenda (`q1-2026-agenda.html`)

---

## Task 1: Shared nav component (`js/nav.js`)

**Files:**
- Create: `js/nav.js`

- [ ] **Step 1: Write `js/nav.js`**

```javascript
// BPP Tools Hub — shared navigation. Inject with: <div id="hub-nav"></div><script src="<path>/js/nav.js" data-page="home"></script>
(function () {
  var script = document.currentScript;
  var page = (script && script.getAttribute('data-page')) || '';
  // Depth: pages in /pages/ need '../' to reach root; index.html is at root.
  var atRoot = !/\/pages\//.test(location.pathname);
  var base = atRoot ? '' : '../';
  var tabs = [
    { id: 'home',        label: 'Home',        emoji: '🏠', href: base + 'index.html' },
    { id: 'departments', label: 'Departments', emoji: '🏢', href: base + 'pages/departments.html' },
    { id: 'library',     label: 'Library',     emoji: '📚', href: base + 'pages/library.html' },
    { id: 'strategy',    label: 'Strategy',    emoji: '🎯', href: base + 'pages/strategy.html' }
  ];
  var tabsHtml = tabs.map(function (t) {
    return '<a class="hub-tab' + (t.id === page ? ' on' : '') + '" href="' + t.href + '">' +
           '<span class="tab-emoji">' + t.emoji + '</span> ' + t.label + '</a>';
  }).join('');
  var html =
    '<nav class="hub-nav">' +
      '<a class="nav-logo" href="' + base + 'index.html" style="text-decoration:none;">' +
        '<div class="nav-logo-mark">B</div>' +
        '<div class="nav-brand">BPP <span>Tools</span></div>' +
      '</a>' +
      '<div class="nav-tabs">' + tabsHtml + '</div>' +
      '<div class="nav-people">' +
        '<button class="person-btn" onclick="togglePerson(\'daunte\',this)">Daunte</button>' +
        '<button class="person-btn" onclick="togglePerson(\'kenny\',this)">Kenny</button>' +
        '<button class="person-btn" onclick="togglePerson(\'eli\',this)">Eli</button>' +
      '</div>' +
    '</nav>';
  var mount = document.getElementById('hub-nav');
  if (mount) mount.outerHTML = html;
})();

// Person switcher — used by the nav (kept global so existing pages keep working).
function togglePerson(name, el) {
  var body = document.body;
  var btns = document.querySelectorAll('.person-btn');
  if (body.getAttribute('data-person') === name) {
    body.removeAttribute('data-person');
    btns.forEach(function (b) { b.className = 'person-btn'; });
  } else {
    body.setAttribute('data-person', name);
    btns.forEach(function (b) { b.className = 'person-btn'; });
    el.classList.add('active-' + name);
  }
}
```

- [ ] **Step 2: Verify in a browser**

Create a throwaway `pages/_navtest.html` containing only `<div id="hub-nav"></div><script src="../js/nav.js" data-page="library"></script>`, open it, confirm the 4-tab nav renders with "Library" active and the logo/person buttons present. Delete `_navtest.html` after.

- [ ] **Step 3: Commit**

```bash
git add js/nav.js
git commit -m "Add shared nav.js component (4-tab Hub nav)"
```

---

## Task 2: Component styles in `css/styles.css`

**Files:**
- Modify: `css/styles.css` (append a new section at end)

- [ ] **Step 1: Append the new component styles**

Append this block to the end of `css/styles.css`. It reuses existing tokens (`--navy`, `--gold`, `--card`, `--border`, `--muted`, `--head`).

```css
/* ===== HUB RESTRUCTURE COMPONENTS ===== */

/* Quick Actions strip (Home) */
.quick-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:20px 0 28px;}
.qa-card{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:8px;padding:14px 16px;text-decoration:none;transition:all .15s;}
.qa-card:hover{border-color:var(--gold);box-shadow:0 4px 14px rgba(0,0,0,.07);transform:translateY(-1px);}
.qa-emoji{font-size:20px;flex:0 0 auto;}
.qa-text{font-family:var(--head);font-size:13px;font-weight:600;color:var(--navy);}

/* Department tiles (Departments landing) */
.dept-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:8px 0 32px;}
.dept-tile{background:var(--card);border:1px solid var(--border);border-top:4px solid var(--gold);border-radius:10px;padding:20px;text-decoration:none;transition:all .15s;}
.dept-tile:hover{border-color:var(--gold);box-shadow:0 6px 18px rgba(0,0,0,.08);transform:translateY(-2px);}
.dept-tile.parked{opacity:.7;border-top-color:var(--muted);}
.dept-tile-name{font-family:var(--head);font-size:16px;font-weight:700;color:var(--navy);margin-bottom:4px;}
.dept-tile-dri{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:10px;}
.dept-tile-owns{font-size:13px;color:var(--text2);line-height:1.5;}

/* Department page sections */
.dept-head{background:var(--navy);color:#fff;border-radius:10px;padding:24px 28px;margin-bottom:24px;}
.dept-head h1{font-family:var(--head);font-size:24px;margin-bottom:6px;}
.dept-head .dept-dri{color:var(--gold);font-size:13px;font-weight:600;}
.dept-head .dept-owns{margin-top:10px;font-size:14px;color:rgba(255,255,255,.85);}
.dept-section{margin-bottom:28px;}
.dept-section-label{font-family:var(--head);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--navy);margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--gold);}
.dept-section-empty{font-size:13px;color:var(--muted);font-style:italic;}

/* Library index */
.lib-group{margin-bottom:26px;}
.lib-group-label{font-family:var(--head);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--navy);margin-bottom:10px;}
```

- [ ] **Step 2: Verify**

Reload `pages/_navtest.html` style or any page after Task 3 — confirm no CSS parse errors (browser devtools console clean). Visual verification happens per-page in later tasks.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "Add CSS for quick-actions, dept tiles, dept pages, library index"
```

---

## Task 3: Update `index.html` (Home)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the hard-coded `<nav class="hub-nav">...</nav>` block**

Delete the entire `<nav class="hub-nav">…</nav>` element (lines ~12-34) and replace with:

```html
<div id="hub-nav"></div>
```

- [ ] **Step 2: Add the `nav.js` include before `</body>`**

Immediately before the existing `<script>` block, add:

```html
<script src="js/nav.js" data-page="home"></script>
```

- [ ] **Step 3: Remove the now-duplicated `togglePerson` function**

`togglePerson` now lives in `nav.js`. Delete the `togglePerson` function definition from the inline `<script>` in `index.html` (keep `setDates`, `fetchHomeStats`, `renderHomeStats`, and the init calls).

- [ ] **Step 4: Add the Quick Actions strip**

Immediately after the `<div class="sec-header">…</div>` block and before the `whatsnew` banner, insert:

```html
<div class="quick-actions">
  <a class="qa-card" href="pages/pre-call.html"><span class="qa-emoji">&#128222;</span><span class="qa-text">Prep a discovery call</span></a>
  <a class="qa-card" href="pages/icp-profiles.html"><span class="qa-emoji">&#127919;</span><span class="qa-text">Qualify a lead</span></a>
  <a class="qa-card" href="pages/kickoff.html"><span class="qa-emoji">&#128640;</span><span class="qa-text">Onboard a client</span></a>
  <a class="qa-card" href="pages/reviews.html"><span class="qa-emoji">&#128200;</span><span class="qa-text">Run the monthly review</span></a>
</div>
```

- [ ] **Step 5: Update the Quick Links section to the 4-tab world**

In the "Internal Reference" `card-grid`, the pages now reachable via Departments/Library/Strategy no longer need individual home-page cards. Keep only: Strategic Plan, Team & AI Workforce, Operating Model Synthesis. Remove the rest (pre-call, kickoff, finance, marketing, ops, systems, reviews, skill-dictionary, service-packages, icp-profiles cards) — they live on their department pages now. Leave the "External Tools" card-grid unchanged.

- [ ] **Step 6: Visual review**

Open `index.html` in a browser. Screenshot. Checklist: 4-tab nav renders with "Home" active · Quick Actions strip shows 4 cards and they hover · person-switcher still filters · stat cards / AR / clients still render from `hub-home-stats.json` · no console errors · Quick Links no longer duplicates department pages.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "Home: 4-tab nav via nav.js + Quick Actions strip"
```

---

## Task 4: Departments landing page (`pages/departments.html`)

**Files:**
- Create: `pages/departments.html`

- [ ] **Step 1: Build the page**

Create `pages/departments.html` as a hub-native page: `<head>` mirrors `index.html` (same fonts + `<link rel="stylesheet" href="../css/styles.css">`), body opens with `<div id="hub-nav"></div>`, a `<main>` with a `sec-header` ("Departments" / "Pick a department to see its playbooks, tools, reference, and AI agents."), then a `.dept-tiles` grid with **6 `.dept-tile` anchors** — one per row of the department table in File Structure. Each tile: `dept-tile-name`, `dept-tile-dri` ("DRI · <name>"), `dept-tile-owns` (the "Owns" line). The HR tile gets class `dept-tile parked` and DRI text "Parked · role not yet filled". End with the standard `hub-footer` (copy from `index.html`) and `<script src="../js/nav.js" data-page="departments"></script>`.

- [ ] **Step 2: Visual review**

Open in browser. Screenshot. Checklist: 6 tiles, "Departments" tab active, HR tile visibly de-emphasized (parked style), all 6 links resolve to the correct `dept-*.html`, on-brand, responsive at narrow width.

- [ ] **Step 3: Commit**

```bash
git add pages/departments.html
git commit -m "Add Departments landing page (6 tiles)"
```

---

## Task 5: Department-page skeleton + Sales & BD page

**Files:**
- Create: `pages/dept-sales.html`

- [ ] **Step 1: Build `dept-sales.html` as the reference skeleton**

Create `pages/dept-sales.html` as a hub-native page (`<head>` like `departments.html`, body opens `<div id="hub-nav"></div>`). Inside `<main>`:

```html
<div class="dept-head">
  <h1>Sales &amp; Business Development</h1>
  <div class="dept-dri">DRI · Kenny Hawkins</div>
  <div class="dept-owns">Pipeline, lead distribution, discovery, and deal admin.</div>
</div>

<div class="dept-section">
  <div class="dept-section-label">Playbooks &amp; Workflows</div>
  <div class="card-grid">
    <a class="link-card" href="pre-call.html"><div class="lc-icon">&#128222;</div><div class="lc-body"><div class="lc-title">Pre-Call Prep</div><div class="lc-desc">Discovery call prep, prospect research</div></div><div class="lc-arrow">&rarr;</div></a>
  </div>
</div>

<div class="dept-section">
  <div class="dept-section-label">Tools &amp; Links</div>
  <div class="card-grid">
    <a class="link-card" href="https://app.hubspot.com" target="_blank"><div class="lc-icon">&#128200;</div><div class="lc-body"><div class="lc-title">HubSpot CRM</div><div class="lc-desc">Pipeline and deal tracking</div></div><div class="lc-arrow">&rarr;</div></a>
  </div>
</div>

<div class="dept-section">
  <div class="dept-section-label">Reference</div>
  <div class="card-grid">
    <a class="link-card" href="icp-profiles.html"><div class="lc-icon">&#127919;</div><div class="lc-body"><div class="lc-title">ICP Profiles</div><div class="lc-desc">Ideal client profiles for outreach + discovery</div></div><div class="lc-arrow">&rarr;</div></a>
    <a class="link-card" href="service-packages.html"><div class="lc-icon">&#128230;</div><div class="lc-body"><div class="lc-title">Service Packages</div><div class="lc-desc">Operator System, Discovery, Growth Engine pricing</div></div><div class="lc-arrow">&rarr;</div></a>
  </div>
</div>

<div class="dept-section">
  <div class="dept-section-label">AI Agents</div>
  <div class="card-grid">
    <a class="link-card" href="skill-dictionary.html"><div class="lc-icon">&#129302;</div><div class="lc-body"><div class="lc-title">discovery-call-prep</div><div class="lc-desc">Automated discovery call prep skill</div></div><div class="lc-arrow">&rarr;</div></a>
  </div>
</div>
```

End with the `hub-footer` and `<script src="../js/nav.js" data-page="departments"></script>` (department pages keep the Departments tab active).

- [ ] **Step 2: Visual review**

Open in browser. Screenshot. Checklist: navy `dept-head` banner with gold DRI line · 4 labeled sections · cards hover · "Departments" tab active · all links resolve.

- [ ] **Step 3: Commit**

```bash
git add pages/dept-sales.html
git commit -m "Add Sales & BD department page (dept-page skeleton)"
```

---

## Task 6: Remaining department pages (Marketing, Finance & Ops, Client Delivery, AI Workforce & Tech)

**Files:**
- Create: `pages/dept-marketing.html`, `pages/dept-finance-ops.html`, `pages/dept-delivery.html`, `pages/dept-ai-tech.html`

- [ ] **Step 1: Build all four**

For each, copy the `dept-sales.html` skeleton from Task 5 and fill the `dept-head` + four sections from that department's row in the File Structure table. Rules:
- A section with no content (e.g. Marketing "Reference") renders `<div class="dept-section-empty">Nothing here yet.</div>` instead of a `card-grid`.
- External links get `target="_blank"`; internal links are bare filenames (same `pages/` folder).
- **AI Workforce & Tech** "AI Agents" section includes a **placeholder card** for the meeting-summary skill: `<div class="link-card" style="opacity:.6;cursor:default;"><div class="lc-icon">&#128197;</div><div class="lc-body"><div class="lc-title">Meeting-summary skill</div><div class="lc-desc">Coming soon — summarizes BPP meetings into the right folders</div></div></div>` (no `href`).
- All four use `data-page="departments"`.

- [ ] **Step 2: Visual review**

Open all four in a browser. Screenshot each. Checklist per page: correct dept name + DRI · empty sections show the italic empty-state · AI-Tech shows the dimmed "Coming soon" meeting-skill card · links resolve · on-brand.

- [ ] **Step 3: Commit**

```bash
git add pages/dept-marketing.html pages/dept-finance-ops.html pages/dept-delivery.html pages/dept-ai-tech.html
git commit -m "Add Marketing, Finance & Ops, Client Delivery, AI Workforce dept pages"
```

---

## Task 7: HR & People department page (parked)

**Files:**
- Create: `pages/dept-hr.html`

- [ ] **Step 1: Build the parked page**

Copy the skeleton. `dept-head` h1 "HR & People", `dept-dri` text "Parked · role not yet filled", `dept-owns` "People ops, contracts, and hiring. This department is parked until the role is filled." Sections: Playbooks/Workflows, Tools/Links → all `dept-section-empty` ("Nothing here yet."). Add one section **"Survey Archive"** with a `card-grid` of three cards linking `bpp-roles-survey.html`, `rodney-feedback-survey.html`, `survey-responses.html`. `data-page="departments"`.

- [ ] **Step 2: Visual review**

Open in browser. Screenshot. Checklist: reads clearly as parked/placeholder · survey archive cards resolve · on-brand.

- [ ] **Step 3: Commit**

```bash
git add pages/dept-hr.html
git commit -m "Add HR & People department page (parked placeholder)"
```

---

## Task 8: Library index (`pages/library.html`)

**Files:**
- Create: `pages/library.html`

- [ ] **Step 1: Build the page**

Hub-native page. `sec-header`: "Library" / "Every page in the Hub, grouped by what it is." Then one `.lib-group` per group in the Library groups list (File Structure), each with a `.lib-group-label` and a `card-grid` of `link-card`s. Reuse each page's existing title/description (pull from `index.html`'s old Quick Links cards for wording). `data-page="library"`.

- [ ] **Step 2: Visual review**

Open in browser. Screenshot. Checklist: 6 groups · every card links to a real page · "Library" tab active · every page from the content map is reachable here · on-brand.

- [ ] **Step 3: Commit**

```bash
git add pages/library.html
git commit -m "Add Library index page"
```

---

## Task 9: Strategy landing (`pages/strategy.html`)

**Files:**
- Create: `pages/strategy.html`

- [ ] **Step 1: Build the page**

Hub-native page. `sec-header`: "Strategy" / "Where BPP is going — plans, operating model, org, and reviews." A single `card-grid` with one `link-card` per item in the Strategy landing links list. The Business Plan card gets a small "New" pill (copy the pill markup from `index.html`'s Strategic Plan card) and links `business-plan.html`. `data-page="strategy"`.

- [ ] **Step 2: Visual review**

Open in browser. Screenshot. Checklist: 7 cards · "Strategy" tab active · Business Plan card flagged New · all links resolve (business-plan.html created in Task 10).

- [ ] **Step 3: Commit**

```bash
git add pages/strategy.html
git commit -m "Add Strategy landing page"
```

---

## Task 10: Business Plan placeholder page (`pages/business-plan.html`)

**Files:**
- Create: `pages/business-plan.html`

- [ ] **Step 1: Build the placeholder**

Hub-native page. `sec-header`: "Business Plan" / "2026–2027". `<main>` contains one clearly-labeled placeholder block: a `whatsnew`-style box (reuse `.whatsnew` class) stating "This page is a placeholder. The business plan is in progress — content drops in here when Daunte completes it. (Spec §10.)" `data-page="strategy"`.

- [ ] **Step 2: Visual review**

Open in browser. Screenshot. Checklist: page renders, clearly reads as a placeholder, "Strategy" tab active, on-brand.

- [ ] **Step 3: Commit**

```bash
git add pages/business-plan.html
git commit -m "Add Business Plan placeholder page (pending content, spec §10)"
```

---

## Task 11: Migrate hub-native pages to `nav.js`

**Files:**
- Modify: `pages/strategic-plan.html`, `pages/builds.html`, `pages/ops.html`, `pages/reviews.html`, `pages/systems.html`, `pages/marketing.html`, `pages/finance.html`, `pages/kickoff.html`, `pages/pre-call.html`

- [ ] **Step 1: Swap the nav on each page**

For each file: replace the hard-coded `<nav class="hub-nav">…</nav>` block with `<div id="hub-nav"></div>`; add `<script src="../js/nav.js" data-page="..."></script>` before `</body>` (data-page = `departments` for ops/systems/marketing/finance/kickoff/pre-call/builds, `strategy` for strategic-plan/reviews); delete any duplicate inline `togglePerson` definition. Keep all other page content and the back-button bar untouched.

- [ ] **Step 2: Visual review**

Open each of the 9 pages in a browser. Screenshot. Checklist per page: 4-tab nav renders · correct tab active · person-switcher works · page content intact · no console errors.

- [ ] **Step 3: Commit**

```bash
git add pages/strategic-plan.html pages/builds.html pages/ops.html pages/reviews.html pages/systems.html pages/marketing.html pages/finance.html pages/kickoff.html pages/pre-call.html
git commit -m "Migrate hub-native pages to shared nav.js"
```

---

## Task 12: Add `nav.js` to standalone pages

**Files:**
- Modify: `pages/team.html`, `pages/q1-2026-agenda.html`, `pages/q1-2026-dashboard.html`, `pages/skill-dictionary.html`, `pages/data-source-map.html`, `pages/delivery-playbook.html`, `pages/icp-profiles.html`, `pages/service-packages.html`, `pages/content-dashboard.html`, `pages/synthesis.html`

- [ ] **Step 1: Add the nav to each page**

For each file: insert `<div id="hub-nav"></div>` as the first element inside `<body>`; add `<script src="../js/nav.js" data-page="..."></script>` before `</body>` (data-page: `strategy` for team/q1-2026-agenda/q1-2026-dashboard/synthesis; `library` for skill-dictionary/data-source-map/delivery-playbook/icp-profiles/service-packages/content-dashboard). If a page links its own stylesheet only and lacks `styles.css`, add `<link rel="stylesheet" href="../css/styles.css">` so `.hub-nav` styles apply. Keep the existing back-button bar.

- [ ] **Step 2: Visual review**

Open each of the 10 pages. Screenshot. Checklist per page: nav renders and is styled (not unstyled HTML) · correct tab active · page content + back button intact · no console errors.

- [ ] **Step 3: Commit**

```bash
git add pages/team.html pages/q1-2026-agenda.html pages/q1-2026-dashboard.html pages/skill-dictionary.html pages/data-source-map.html pages/delivery-playbook.html pages/icp-profiles.html pages/service-packages.html pages/content-dashboard.html pages/synthesis.html
git commit -m "Add shared nav.js to standalone Hub pages"
```

---

## Task 13: Full link audit + memory update

**Files:**
- Modify: `_claude` memory (workspace) — note only; and `docs/specs/2026-05-17-hub-restructure-design.md` status line

- [ ] **Step 1: Click-through audit**

From `index.html`, click every nav tab, every Quick Action, every department tile, every department-page card, every Library card, every Strategy card. Confirm zero 404s and every page shows the 4-tab nav. Fix any broken relative path inline and commit the fix.

- [ ] **Step 2: Screenshot the full set**

Capture a screenshot of Home, Departments, all 6 dept pages, Library, Strategy. Confirm visual consistency (one nav, one theme, consistent spacing).

- [ ] **Step 3: Update the BPP Tools Hub memory**

Update `reference_bpp_hub.md` in the Claude memory directory: new 4-tab structure, `nav.js` shared component, department-page convention. Replace the stale "Current pages" list.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Link audit pass + update Hub architecture notes"
```

---

## Task 14: Stop — production gate

- [ ] **Step 1: Do NOT merge to `main`**

The `hub-restructure` branch is complete and verified. Per spec §10, the merge to `main` (which auto-deploys to GitHub Pages) is **gated on Daunte's explicit go** — after the business plan content is in and the meeting skill's path is settled. Report completion, list what was built, and wait.

- [ ] **Step 2: Push the branch for review**

```bash
git push -u origin hub-restructure
```

Report: branch pushed, all pages built and screenshot-reviewed, awaiting go-ahead to merge.

---

## Self-Review

**Spec coverage:** §4 nav → Tasks 1,3,11,12. §5 Home + Quick Actions → Task 3. §6 Departments + 6 dept pages + shared template → Tasks 4-7. §7 Library → Task 8. §8 Strategy → Task 9. §9 content map → Tasks 4-12 (every page placed). §10 in-flight slots → Task 6 (meeting-skill card), Task 10 (business-plan page). §11 build approach (branch, screenshot review) → every page task + Task 14. §13 success criteria → Task 13 audit. Covered.

**Placeholder scan:** The only "placeholder" content is intentional and spec-mandated (business-plan.html, the meeting-skill card) — both are fully specified, not plan gaps. No TBD/TODO steps.

**Type consistency:** `data-page` values (`home`/`departments`/`library`/`strategy`) match the tab `id`s in `nav.js`. CSS class names (`quick-actions`/`qa-card`/`dept-tiles`/`dept-tile`/`dept-head`/`dept-section`/`lib-group`) are defined in Task 2 and used consistently in Tasks 3-10. `togglePerson` defined once in `nav.js`, removed everywhere else.
