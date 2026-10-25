# BPP Tools — 2026 Industry-Standard Modernization Plan

> **SUPERSEDED 2026-06-10 by [`2026-06-10-site-modernization-v2.md`](./2026-06-10-site-modernization-v2.md).** v2 raises the bar from "docs polish" to agency-grade craft + an AI-forward showcase layer, drops the Daunte sign-off gate, and fixes the page count (42, not 35). This file is kept for history. Read v2 for the live plan.

## Context

The BPP Tools Hub (`buildwithbpp.github.io/bpp-tools/`) is a hand-authored static site: 30+ HTML pages, 405-line shared CSS, two JS files, no build step, no CI. It functions but is structurally behind 2026 standard for an internal docs/hub site. Goal is for it to feel comparable to Stripe Docs / Linear Docs / Vercel Docs in polish and feature set — a real modernization, not just hygiene fixes — while preserving the "free static hosting, no DevOps" deploy story.

The previous "no framework, keep vanilla HTML" constraint is dropped. Whatever's actually industry standard is on the table.

**Scope:** Full rebuild on a modern stack. ~12-15 dev days, phased so each phase ships independently and the site stays live the whole time.

## Recommended stack

| Layer | Choice | Why |
|---|---|---|
| **Site framework** | **Astro 5** | Purpose-built for content-heavy sites with islands of interactivity. Outputs static HTML (works on any free host). Ships ~18KB JS per page vs Next.js ~180KB. Lighthouse 98-100 vs Next.js static-export ~80-90. Cloudflare acquired Astro Jan 2026, well-resourced. The 2026 pattern is "Astro for marketing/docs, Next.js for the app dashboard" — BPP Tools is the first. |
| **UI components** | **shadcn/ui** (React islands) | 70K-star 2026 default. Copy-into-repo model means BPP owns every component file — no library lock-in, fully customizable. Only loaded as React islands where actually used (Dialog, Combobox, Tabs); 30+ pure content pages stay zero-JS. |
| **Styling** | **Tailwind v4** + existing CSS custom properties as theme tokens | Existing navy/gold/eli/kenny/daunte palette maps cleanly to Tailwind theme tokens. Utility-first with design tokens — the 2026 standard. |
| **Content** | **Astro Content Collections** (Markdown/MDX + typed YAML/JSON) | Active clients list as typed YAML, AR forecasts as CSV imported at build, narrative content as MDX. No CMS yet — defer Tina until non-developer editing is a real bottleneck. |
| **Search** | **Pagefind** | Static, builds full-text index at build time, no service to run. The 2026 default for static sites. Wires into shadcn Cmd-K palette. |
| **Hosting** | **GitHub Pages** (unchanged) | Stay on the current host. Astro's static output deploys to GH Pages cleanly via `actions/deploy-pages`. Live URL (`buildwithbpp.github.io/bpp-tools/`) stays the same. No DNS migration, no bookmark churn, no teammate confusion. Trade-off: no per-branch preview deploys — staging happens locally via `astro dev` / `astro preview` before merging to `main`. |
| **Analytics** | **Plausible** | Privacy-friendly, free <10K visits/mo, no cookie banner needed. |
| **CI** | GitHub Actions: Biome (format+lint), Pa11y-CI (a11y gate), Lighthouse CI (perf gate), Hyperlink (link checker), html-validate. |

## Target architecture

```
bpp-tools/
  src/
    components/
      ui/              # shadcn components (copied in, owned by us)
      nav/             # TopNav.astro, Sidebar.astro, Breadcrumbs.astro
      content/         # Callout.astro, CodeBlock.astro, Tabs.astro
      widgets/         # MeetingAgenda.tsx, Scorecard.tsx, PersonFilter.tsx (React islands)
    layouts/
      BaseLayout.astro # <head>, fonts, OG meta, theme script, skip link
      DocsLayout.astro # BaseLayout + sidebar + TOC + breadcrumbs + last-updated
    content/
      pages/           # MDX content pages (auto-routed)
      _data/           # Typed YAML: clients.yaml, departments.yaml, links.yaml
    pages/             # Astro routes (index.astro, 404.astro, changelog.astro, etc.)
    styles/
      global.css       # Tailwind layers + custom properties (palette, type)
  public/
    fonts/             # Self-hosted WOFF2 (subset)
    favicon/           # Full favicon set
    og-default.png     # Default Open Graph image
  astro.config.mjs
  tailwind.config.js
  biome.json
  package.json
  .github/workflows/
    ci.yml             # Build + lint + a11y + perf + link check on PRs
    deploy.yml         # Build + deploy to GitHub Pages on main
  docs/
    plans/
      2026-05-21-site-modernization.md   # This plan
    contributing.md
    getting-started.md
```

## Feature set (industry-standard 2026 polish)

Fifteen features the modernization adds:

1. **Pagefind full-text search** wired to a Cmd-K palette (shadcn Dialog + Combobox).
2. **Open Graph + Twitter card meta** on every page — Slack/iMessage previews look right.
3. **Dark mode** (system default + manual toggle persisted to localStorage).
4. **Code blocks** with syntax highlighting (Shiki at build time) + copy button.
5. **Callout components** (Note / Tip / Warning / Danger) via MDX.
6. **Left sidebar nav** auto-generated from content collections, collapsible sections.
7. **Right-rail auto-TOC** from H2/H3 with scroll-spy highlight.
8. **Breadcrumbs** from URL path.
9. **Last-updated timestamp** at page foot, injected at build from `git log -1`.
10. **Skip-to-content link** + visible focus rings + `prefers-reduced-motion` respected everywhere.
11. **Changelog page** with RSS feed.
12. **Full favicon set** (16/32/180/192/512) + custom 404 routing back to search.
13. **Keyboard shortcut overlay** (press `?` for cheatsheet).
14. **Plausible analytics** + "Was this page helpful?" thumbs feedback widget.
15. **Link prefetch on hover/viewport** + Astro View Transitions for instant page transitions.

## Phased rollout

### Phase 0 — Decisions + scaffolding (Day 1)

- Confirm stack with Daunte. Eli is sponsoring this rebuild, but Daunte built bpp-tools v1 and is the lead dev — get him onboard before any code lands.
- Scaffold a parallel branch `astro-rebuild`. The current `main` continues to serve the live site on GitHub Pages, untouched, until cutover.
- During the rebuild, review happens via local dev (`npx astro dev` for hot-reload, `npx astro build && npx astro preview` for production-mode local preview). No staging URL — the current GH Pages site stays live as the only public surface until Phase 6.

### Phase 1 — Core Astro shell (Days 2-4)

- `npm create astro@latest`, configure for Tailwind v4 + MDX integration.
- Install shadcn-ui CLI, init, copy in Button / Dialog / Combobox / Sheet / Tabs / Accordion.
- Self-host Inter/Montserrat/Merriweather as WOFF2 (subset via `glyphhanger`), drop Google Fonts.
- Port the existing CSS palette into `tailwind.config.js` as theme tokens. `navy`, `gold`, `eli`, `kenny`, `daunte` become named utilities (`bg-navy`, `text-gold`, etc.).
- Build `BaseLayout.astro` with: `<head>` (OG meta, favicons, theme script for FOUC-free dark mode), skip link, top nav, footer.
- Build top nav as an Astro component (shadcn `NavigationMenu`). Keep current 4 tabs.
- Configure `astro.config.mjs` with `site: 'https://buildwithbpp.github.io'` and `base: '/bpp-tools'` so links resolve correctly on the GH Pages project URL.
- Confirm `npx astro build && npx astro preview` serves the shell correctly under the `/bpp-tools` base path locally.

**Verification:** Local preview serves a blank-but-styled site with working nav at `http://localhost:4321/bpp-tools/`. Lighthouse 95+ on the shell page.

### Phase 2 — Content migration (Days 5-8)

- Define Astro Content Collections schemas in `src/content/config.ts`: pages, clients, departments, links, changelog.
- Migrate all 35 pages from HTML to MDX, batches of 5-7. For each page:
  - Front-matter: `title`, `description`, `section`, `lastUpdated` (auto via git), `og.image` (optional).
  - Body in MDX. Most pages are mostly content; a few have interactive widgets that become React island imports.
- Migrate `data/hub-home-stats.json` and the Cloudflare Worker refresh: stays as-is, just consumed by an Astro component on the homepage.
- Replace the runtime-parse search (current `nav.js`) with Pagefind. Index built during `astro build`; search palette opens via `/` or `Cmd+K`.

**Verification:** Visual parity across all 35 pages in local preview. Pagefind returns hits on full-text, not just titles.

### Phase 3 — Interactive widgets refactor (Days 9-10)

Convert the existing inline-JS widgets to React islands so they get type safety, shadcn polish, and proper state:

- **Meeting agenda** (in `pages/ops.html`): React island, shadcn `Checkbox` + `Textarea`, state in localStorage so it survives reloads. "New Meeting" button confirmed via shadcn `AlertDialog`.
- **Weekly scorecard** + **quarterly review calc**: React islands with shadcn `Input` + computed displays. Formulas extracted into a typed module.
- **Person filter** (Daunte/Kenny/Eli buttons): React island with shadcn `ToggleGroup`. Backing logic stays as `body[data-person="…"]` so existing CSS rules keep working.
- **Search** (already done in Phase 2 via Pagefind).

**Verification:** All widgets work end-to-end in local preview. Meeting agenda state persists across reloads. Scorecard math matches the current site's output.

### Phase 4 — Industry-standard polish (Days 11-13)

The 15 features above, grouped:

- **Dark mode** + theme script (FOUC-free).
- **Sidebar nav** (shadcn `Sheet` on mobile, persistent on desktop) auto-built from the pages collection.
- **Right-rail TOC** with `IntersectionObserver` scroll-spy.
- **Breadcrumbs** component from URL path.
- **Last-updated timestamp** injected at build from `git log -1 --format=%cI` per file.
- **Open Graph metadata** in `BaseLayout`, with per-page overrides via front-matter. Default OG image as `public/og-default.png`.
- **Favicon set** + manifest.json + Apple touch icons.
- **Changelog page** + RSS feed via `@astrojs/rss`.
- **Custom 404** that opens the search palette pre-populated.
- **Keyboard shortcut overlay** (`?` to open) — single shadcn `Dialog` listing all shortcuts.
- **Skip link** + global `:focus-visible` ring + `prefers-reduced-motion` guards on every transition.
- **Plausible analytics** script + "Was this page helpful?" widget (anonymous thumbs, stored as a Plausible custom event).
- **View Transitions** via Astro's built-in `<ClientRouter />` for instant page changes.
- **Link prefetch** via Astro's default behavior.

**Verification:** Lighthouse on local `astro preview` build: perf 95+, a11y 100, best-practices 100, SEO 100. Manual walk-through of the 15 features.

### Phase 5 — CI/CD + docs (Day 14)

- `.github/workflows/ci.yml` (on PRs): Biome check, `astro build`, Pa11y-CI + Lighthouse CI against the local build, Hyperlink (link checker) across `dist/`, html-validate.
- `.github/workflows/deploy.yml` (on push to `main`): `npm ci && npx astro build`, then `actions/upload-pages-artifact` + `actions/deploy-pages` to publish `dist/` to GitHub Pages. Replaces the current implicit "GH Pages serves `main` directly" model — the workflow now owns the build step.
- One-time repo setting change: in **Settings → Pages**, switch source from "Deploy from a branch" to "GitHub Actions."
- Update `README.md` for the new stack (Astro, Tailwind, shadcn, Pagefind) — hosting story stays "GitHub Pages, deployed by Actions."
- Update `CLAUDE.md` Architecture Notes.
- New `docs/contributing.md`: "Add a page in 10 minutes" — create MDX file in `src/content/pages/`, fill front-matter, write content, push.
- Update `docs/getting-started.md`: `npm install`, `npm run dev`, `npm run build`. Same on Mac/Windows.

**Verification:** CI runs green on a no-op PR. New contributor can ship a page using only `docs/contributing.md`. Read the doc end-to-end.

### Phase 6 — Cutover (Day 15)

- Final visual / functional QA against the local `astro preview` build.
- Daunte + Eli walk through the local build together — agreement to merge.
- Tag the pre-rebuild commit on `main` as `legacy-html-v1` so the old site is archived in git history (recoverable if anything goes catastrophically wrong post-merge).
- Merge `astro-rebuild` → `main`. The deploy workflow runs `astro build` and publishes `dist/` to GitHub Pages. **Same URL** (`buildwithbpp.github.io/bpp-tools/`) — no bookmarks break, no Monday board / Slack link migration needed.
- Watch the first deploy: confirm 200 on the homepage, walk 5 pages, verify search works, verify dark mode toggles.

**Verification:** Production URL serves the new site at the unchanged URL. Team confirms in standup.

## Critical files (current state, before rebuild)

- `index.html` → becomes `src/pages/index.astro`
- `css/styles.css` → palette extracted to `tailwind.config.js`, rest discarded
- `js/nav.js` → logic replaced by Astro components + Pagefind
- `pages/` → all 35 files become MDX under `src/content/pages/`
- `data/hub-home-stats.json` → kept as-is; existing Cloudflare Worker keeps refreshing it
- `worker/` → untouched, out of scope for this rebuild

## What's explicitly NOT in scope

- Replacing the Cloudflare Worker (`worker/`) — it does data sync, stays as-is.
- A headless CMS (Tina, Sanity, Contentful). Markdown/MDX in the repo is fine for a 3-person team. Revisit Tina if non-developer editing becomes a real ask.
- Auth / login. Person filter stays as a visual toggle, not real identity.
- Mobile-app wrapper. The web site at modern polish is the deliverable.
- Hosting migration. Staying on GitHub Pages, same URL.

## Verification at the macro level

Before final cutover (Phase 6):
1. Lighthouse on local `astro preview` build: perf ≥95, a11y 100, best-practices 100, SEO ≥95.
2. Pagefind returns ≥1 hit for a search across page body content (not just title).
3. Open the homepage in Slack to verify the OG card renders.
4. Toggle dark mode and reload — preference persists.
5. Press `?` — keyboard shortcut overlay opens.
6. Press `/` — search palette opens, instantly.
7. Click any internal link — page transitions feel instant (View Transitions).
8. Open dev tools, throttle to 3G — homepage still loads under 2s.
9. Run Pa11y-CI locally — zero violations.
10. New-contributor smoke test: have someone add a page using only `docs/contributing.md`. Time it. Should be ≤10 minutes.

## Decisions still open

Two load-bearing decisions before Phase 0 can start:

1. **Commit to shadcn/ui + React islands.** This brings React into the repo for the first time. shadcn components are TSX, the four interactive widgets become TSX, but Astro still renders most pages as plain HTML. Trade-off: dramatically better polish at the cost of a slightly steeper learning curve for any non-React teammate. If Daunte hasn't worked in React, plan to onboard him in Phase 1.

2. **Daunte's involvement and timeline.** Daunte is the lead dev on bpp-tools per `BuildwithBPP/.github/CLAUDE.md`. A rebuild this large should be his call as much as Eli's. Recommend: a 30-min sync to walk through this doc, agree on the stack, the timeline, and who owns which phase. Can draft a one-page brief for him if helpful.
