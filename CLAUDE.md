# BPP Tools - Claude Code Instructions

> **Inherits from the BuildwithBPP org base.** Org-wide rules (brand voice, lane rule, secrets, code conventions, how to work with Claude in BPP repos) live in [`BuildwithBPP/.github/CLAUDE.md`](https://github.com/BuildwithBPP/.github/blob/main/CLAUDE.md). When the org base changes, propagate the relevant section into this file. Repo-specific rules are below.

This is the BPP team hub repo. Shared context, onboarding docs, and cross-project utilities for the Business Plans Plus development team.

## Who We Are

Business Plans Plus (BPP) is a growth consulting firm in Temple Terrace, FL. We help growth-stage entrepreneurs build operating systems that make their business easier to run.

**Team:**
- Daunte Benjamin: Co-Owner, Data & Operations (Lead Developer)
- Kenny Hawkins: Co-Owner, Business Development & Client Growth
- Eli Fisher: Co-Owner, Design, Sales & Client Experience

**Website:** buildwithbpp.com

## Git Operations

**Claude handles all git operations for this team.** When someone says to save, push, commit, or create a PR, handle it. Explain what you're doing so the team learns by watching.

### Rules
- Write clear commit messages
- For feature work, create a branch: `yourname/what-you-did` and merge via PR
- Small fixes and content updates can go directly to `main`
- Delete branches after merge

## Repo Structure

```
bpp-tools/
  index.html                   # Home page (stats, who's-on-what, quick links)
  CLAUDE.md                    # You are here
  README.md                    # Team overview and usage guide

  css/
    styles.css                 # Shared CSS for all pages (design system, nav, cards, ops hub)

  js/
    nav.js                     # Shared top nav (logo, tabs, global search, person filter). Injected into <div id="hub-nav">.

  pages/
    pre-call.html              # Pre-Call toolkit (discovery, ICP, proposals)
    kickoff.html               # Kickoff toolkit (onboarding, playbook)
    ops.html                   # Operations hub (meeting agenda, scorecard, quarterly review)
    finance.html               # Finance tools (QuickBooks, invoices, subscriptions)
    marketing.html             # Marketing tools + content dashboard iframe
    systems.html               # Systems, platforms, and AI skills
    skill-dictionary.html      # Searchable AI skill dictionary (37 skills + 9 plugins)
    content-dashboard.html     # Content performance dashboard (reference page)
    delivery-playbook.html     # Delivery SOPs and standards (reference page)
    icp-profiles.html          # Ideal client profiles (reference page)
    service-packages.html      # Service package details (reference page)
    data-source-map.html       # Data flow diagram (reference page)

  context/                     # BPP company context (copied from OneDrive)
    bpp-overview.md            # Company info, services, pricing, ICP
    brand-voice.md             # Brand voice guide for all written output

  docs/                        # Team onboarding and reference
    getting-started.md         # Dev environment setup (Mac + Windows)
    git-basics.md              # The 10 git commands you need
    claude-code-basics.md      # How to use Claude Code
```

## Brand Voice

Read `context/brand-voice.md` for all written output. Key rules:
- Direct, confident, entrepreneur-friendly
- No em dashes, no "leverage" as a verb, no filler phrases
- Numbers like a business owner: "~$3.8K/month"

## Architecture Notes

- Each hub tab is a standalone HTML page in `pages/`. The Home page is `index.html` at the root.
- All pages share `css/styles.css` for consistent styling. Change it once, every page updates.
- The top nav is injected by `js/nav.js` on every page (each HTML file has `<div id="hub-nav"></div>` and a `<script src=".../js/nav.js" data-page="…">` tag). Edit the nav in one place, every page updates.
- **A hub page must load BOTH `css/styles.css` and `js/nav.js`.** Loading only the script renders an unstyled 251px-tall nav. Three survey pages did exactly that until 2026-07-31.

## Mobile (added 2026-07-31)

The hub is mobile responsive from the shared layer only — no page-by-page media queries. Verified by rendering all 53 hub pages at 320/390/430px.

- **Nav.** At `<=768px` the bar collapses to 56px (logo + search icon + hamburger) and the tabs, person filter and privacy toggle move into a slide-in drawer. `.nav-collapse` is `display:contents` on desktop, so the bar keeps its original layout and there is exactly one DOM instance of every control — no duplicated buttons to desync. Desktop order is set with CSS `order`, not DOM order.
- **`.hub-nav` carries `z-index:140` at mobile and must keep it.** `.hub-nav` is `position:sticky` with a z-index, so it forms a stacking context; the drawer lives inside it and its own z-index is resolved *within* that context. At the default `100` the `z-index:125` backdrop covers the open drawer and swallows every tap on it.
- **Four measured safety nets run in `js/nav.js` at `<=768px`** (`stackTables`, `collapseGrids`, `wrapOverflowingRows` + `enforceTapTargets`, then `relaxOverflowing`). They *measure* the rendered page rather than matching a selector list, which is how ~25 pages with their own `<style>` blocks get fixed without being edited. All of them record what they changed and undo it when the viewport crosses back to desktop.
- **Tables** become label/value cards; each `<td>` is stamped with `data-l` from its column header. Tables with colspans, mismatched row widths or no header fall back to a `.table-scroll` container so the *page* never scrolls sideways. A page can opt out with `data-mobile="stack|scroll|off"` on the table. Tables populated from JSON after load are handled by a MutationObserver, and an empty `<tbody>` is contained but left unclassified so it can still stack once rows arrive.
- **When adding a page-local class, avoid the shared nav names** (`.nav-tabs`, `.nav-brand`, `.hub-tab`, `.nav-people`, `.person-btn`). The mobile nav rules are scoped under `.hub-nav` / `.nav-collapse` precisely because `delivery-playbook.html` and `survey-responses.html` define their own `.nav-tabs`.
- **Known gap:** `delivery-playbook.html` clips ~49px at 320px from its own page-local nav strip. Clean at 390 and 430.
- Regression check: render each page and assert zero elements past the viewport, zero tap targets under 44px, and zero form fields under 16px (under 16px makes iOS zoom the page on focus).
- **Global search:** the search input in the nav builds its index at runtime by fetching `pages/library.html` and `pages/departments.html` and parsing their `.link-card` and `.dept-tile` elements. **There is no separate search-index file to maintain.** To add a page to search, add a card for it on the Library page (or a dept tile on Departments). If you significantly refactor the markup of those two pages (renaming `.link-card`, `.lc-title`, `.lc-desc`, `.dept-tile`, `.dept-tile-name`, `.dept-tile-owns`), update `js/nav.js` too.
- The Ops page (`pages/ops.html`) has significant embedded JS: meeting agenda, scorecard calculations, quarterly review formulas. Edit carefully.
- Reference pages (ICP profiles, service packages, etc.) are self-contained HTML files linked from the hub but not styled by `styles.css`.
- The content dashboard is loaded via iframe in `pages/marketing.html`.

## Other BPP Repos

| Repo | Purpose |
|------|---------|
| `BuildwithBPP/bpp-webflow-site` | Website code, Webflow export, SEO/copy tools |
| `BuildwithBPP/ruflo` | Agent orchestration platform (forked from ruvnet/ruflo) |

## How Memory Works Across BPP

| What | Where | Updated By |
|------|-------|-----------|
| Business memory (clients, decisions) | OneDrive: `_claude/memory.md` | Anyone via Cowork |
| Website dev context | `bpp-webflow-site` repo CLAUDE.md | Daunte/Eli via Claude Code |
| Team dev knowledge | This repo: `docs/` | Anyone via Claude Code |
| Brand voice / company overview | OneDrive (source), this repo (copy) | Daunte |

Documentation about *how to build something* lives in the project repo.
Documentation about *the business* lives in OneDrive.
This repo bridges the gap with shared context and onboarding docs.
