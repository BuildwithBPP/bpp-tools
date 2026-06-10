# BPP Tools — Site Modernization v2: The Agency-Grade, AI-Forward Rebuild

**Date:** 2026-06-10. **Supersedes:** `2026-05-21-site-modernization.md` (v1).

## What changed since v1, and why

v1 set the bar at "Stripe / Linear / Vercel docs polish." v2 raises it to two things at once:

1. **Jaw-dropping, million-dollar-agency visual craft** (Awwwards / FWA tier), and
2. **An AI-forward showcase layer that proves BPP implements things other websites structurally cannot.**

The hub is a public URL (`buildwithbpp.github.io/bpp-tools/`, no auth). Prospects can and do see it. So it doubles as a credibility piece: the internal operating system we built, pulled up live in a sales call as proof of what BPP ships. That reframing is the spine of v2.

Three research threads inform this version (design language, motion on the static stack, AI-forward features). The single most important finding, repeated independently across all three: **a $1M site is 80% systematic restraint and craft, 20% spectacle.** We win on craft plus genuine AI substance, not on WebGL spectacle, which is exactly what wrecks a content/docs hub.

**Two v1 premises are retired:**
- **Daunte sign-off gate: dropped.** Eli owns this call on website builds. Ask-forgiveness applies. No approval gate before code lands.
- **Page count was stale.** It is now 42 HTML pages in `pages/` plus a root-level `bpp-client-acquisition-strategy.html` deck, not the 35 v1 assumed. Migration surface is larger.

**The core stack from v1 is unchanged and correct:** Astro 5 + shadcn/ui + Tailwind v4 + Pagefind, static output on GitHub Pages, same URL, Cloudflare Worker available for any dynamic need. v2 adds a design-craft layer, a motion toolkit, and an AI-forward layer on top of it.

---

## The expanded stack

| Layer | Choice | Notes |
|---|---|---|
| **Framework** | Astro 5 (static SSG) | Unchanged. Zero-JS by default; islands where needed. |
| **Components** | shadcn/ui (React islands) | Now a definite yes. The AI widgets need React anyway. |
| **Styling** | Tailwind v4 + CSS custom properties as tokens | Palette (navy/gold/eli/kenny/daunte) becomes theme tokens. |
| **Search** | Pagefind | Static full-text, wired to a Cmd-K palette. |
| **Hosting** | GitHub Pages | Unchanged. Same URL. No DNS migration. |
| **Motion engine** | **GSAP (+ ScrollTrigger, SplitText, Flip)** | Now 100% free including former Club plugins (Webflow acquisition). Run from plain `<script>`, not React islands, so it adds zero React runtime. |
| **Smooth scroll** | **Lenis** | Tiny. Gate behind `prefers-reduced-motion`; tie lifecycle to Astro nav events (known ClientRouter conflict). |
| **Island motion** | **Motion (ex-Framer Motion) via `LazyMotion`/`m`** | ~4.6KB init vs ~34KB full. Only for genuinely interactive React widgets. |
| **List/grid motion** | **AutoAnimate** | ~2KB, zero-config, for filter/reorder/accordion. |
| **Page transitions** | **Astro ClientRouter** (or native `@view-transition` CSS) | Confirmed works on static GH Pages (client-side JS, no server). Shared-element morphs for index to detail. |
| **"3D" moments** | **Pre-rendered video / Rive / dotLottie / Spline**, in that cost order | One signature moment max, lazy-loaded, never the LCP element. Avoid React Three Fiber (~1MB) and Vanta. |
| **AI spine** | **Cloudflare Worker → Anthropic API**, streamed via SSE | The Worker is the only server surface. API key stays server-side. |
| **AI models** | Opus 4.8 (`claude-opus-4-8`) flagship · Sonnet 4.6 (`claude-sonnet-4-6`) mid · Haiku 4.5 (`claude-haiku-4-5`) workhorse | Prompt-cache stable prompts (cached input ~0.1x). |
| **CI** | GitHub Actions: Biome, Pa11y-CI, Lighthouse CI, link check, html-validate | Unchanged from v1. |

---

## Layer 1 — Agency-grade design craft

This is where 90% of the "expensive" feel comes from, at low effort and near-zero usability risk. Apply Tier 1 everywhere. Tiers 2 and 3 are garnish for landing and section surfaces only, never the article body.

### Tier 1 — do all of these (low risk, high signal)
- **Fluid type scale with `clamp()`.** Type scales continuously with viewport. Build a modular scale (Major Third on mobile to Perfect Fifth on large screens).
- **Disciplined two-font pairing** (refined sans + mono, or sans + editorial serif). Heavy weights reserved for hero moments only. Strongest single "considered and expensive" signal.
- **A real 4px spacing system** (4/8/12/16/24/32) plus generous whitespace. ~1.5x more space above a heading than below. Whitespace is the cheapest luxury signal.
- **One accent color, everything else neutral.** The accent is reserved for interactive elements. The "rainbow effect" is the number-one tell of cheap or AI-generated UI.
- **Content-over-chrome.** Light or absent borders, subtle shadows, kill heavy cards. Premium is what you remove.
- **Restrained reveal-on-scroll.** Subtle staggered fade/translate as content enters. Gated behind `prefers-reduced-motion`.
- **Cross-document View Transitions** for page/route morphs. The highest-leverage single web-platform feature for a multi-page content site: SPA "buttery" feel, GPU-accelerated, degrades gracefully.
- **Cinematic dark mode** (rich near-black, not pure `#000`; luminous accents; balanced contrast). System default plus persisted toggle.
- **Hover micro-interactions with intent** on links, rows, nav. Motion as feedback, not decoration.

### Tier 2 — garnish on landing/section surfaces (medium effort/judgment)
Asymmetric editorial layouts · oversized/kinetic display type · sticky/pinned sections + scroll-progress cues · bento-grid index/overview pages · mature glassmorphism on floating chrome (nav, command palette) only · atmospheric ambient gradients · text-scramble/decode reveal on one or two hero lines.

### Tier 3 — skip or use very sparingly on a content hub
Custom cursor + magnetic buttons (usability liability on a docs site; skip or limit to a single marketing landing). · WebGL/Three.js hero + sound design (heavy on perf and maintenance; near pure downside here; at most one lazy-loaded splash if leadership demands a hero moment).

**The differentiator, stated plainly:** a good template gives you components; a million-dollar site gives you a *system*. One fluid type scale, one spacing rhythm, one accent, two fonts, enforced everywhere. Consistency at scale plus whitespace plus motion-with-meaning plus fast load. Not feature density.

---

## Layer 2 — Motion toolkit (how we hit it on static GH Pages)

The posture: mostly-CSS-and-GSAP, almost-no-React-runtime. Keep the animation engine outside React islands, hydrate as little JS as possible, reserve any WebGL for one hero moment.

- **GSAP is the core engine.** Now free including ScrollTrigger / SplitText / Flip / MorphSVG. Run it from a plain `<script>` in an `.astro` component, not inside a React island, so React never enters scroll/timeline work. Core + ScrollTrigger ~50KB gzipped, loaded once site-wide. Wrap in `gsap.context()` for clean teardown on navigation.
- **Lenis** for smooth scroll. Disable entirely under `prefers-reduced-motion`. Known conflict with Astro ClientRouter (over-saves scroll history): reinitialize on `astro:page-load`, destroy on `astro:before-swap`.
- **Motion via `LazyMotion` + `m`** only for interactive React islands (modals, drawers, gesture widgets). `client:visible` below the fold, `client:idle` for nav-level.
- **AutoAnimate** for list/grid/tab reorders and filters. Element-level, ~2KB.
- **Astro ClientRouter** for transitions, or the native `@view-transition { navigation: auto }` CSS path (zero router, no GSAP cleanup tax) as the simpler fallback. Watch: shared-element morphs break inside `overflow:hidden` ancestors.
- **"3D" by cost order:** pre-rendered video/image-sequence first (zero JS, can't hurt Lighthouse) → Rive for interactive vector (~200KB WASM, tiny `.riv` files) → dotLottie for simple loops → Spline for one authored interactive hero (lazy, static LCP poster) → vanilla Three.js + GSAP only for genuinely bespoke WebGL. Avoid React Three Fiber (~1MB, React tax) and Vanta.js.

### Performance guardrails (non-negotiable, this is also the AI-forward proof)
- **Hydration discipline:** default static `.astro`; `client:load` only for true above-fold interactivity; `client:idle` for menus/stats; `client:visible` for everything below fold. GSAP/Lenis as scripts, never islands.
- **`prefers-reduced-motion` mandatory:** gate every JS animation; add a global CSS backstop; disable Lenis in that mode.
- **CLS target 0.0:** explicit dimensions / aspect-ratio on all media including Lottie/Rive/Spline containers; reserve hero space; no font reflow.
- **Fonts:** self-host (`@fontsource` or WOFF2 subset with preload + fallback metrics). No Google Fonts at runtime.
- **Bundles:** manual vendor chunks (`vendor-motion`, `vendor-icons`, `vendor-3d`); per-icon imports; `LazyMotion` if Motion is in the tree.
- **Protect LCP:** largest element is HTML/image/text, never a WebGL canvas or hydrating island. Fancy stuff fades in after LCP.

Reference: named Astro sites already winning at this tier (Awwwards "Astro" SOTD): Thorgal, Enerblock, ASTRODITHER, The Agency of Love & Logic, Aupale Vodka. The framework is not the ceiling.

---

## Layer 3 — AI-forward showcase (the "other sites can't do this" layer)

**Architectural spine (this is itself part of the pitch):** Astro static shell on GitHub Pages, Cloudflare Worker as the only server-side surface. Every Claude call goes Worker → Anthropic API so the key never touches the browser. Stream Server-Sent Events back so the page feels alive. Flagship reasoning on Opus 4.8, mid-weight agent demos on Sonnet 4.6, high-volume/low-latency (assistant, classification) on Haiku 4.5. Prompt-cache stable system prompts and retrieved context.

**Cost posture:** unlike the visual rebuild (free), these features carry a small, bounded per-run API cost and require an Anthropic key + budget on the Worker. All of it rate-limited and length-capped per IP, fixtures only, hard `max_tokens` ceilings. Recommendation: ship the visual rebuild (Phases 0-6, free) first, then switch on the AI layer when cash allows.

### Lead with these three (ranked by how hard they are to fake)

**1. Live agent demo a visitor can run — "watch an agent do your job." The headline feature.**
A button on a case-study page: "Watch our agent audit this client's funnel." Click streams a live agent trace: the agent states a plan, calls tools over sandboxed fixtures (fake analytics, landing page, CRM-shaped data), narrates findings, and produces a deliverable (RAID log, teardown, 3-recommendation memo). The visitor sees reasoning, tool calls, and the artifact appear in real time, not a canned video. Rendered as a live timeline/DAG with nodes going pending → running → done. Build: DIY tool-use loop in the Worker over fixtures, SSE to the browser, Opus 4.8 with `thinking: {type:"adaptive", display:"summarized"}` so the reasoning is visible. Pre-defined scenarios only, rate-limited, synthetic data. **~$0.10-0.35/run, 20-60s (the wait is the show).** This is the one thing Webflow/Framer/Wix structurally cannot reproduce. Be transparent it runs on a safe demo dataset.

**2. Ask-anything RAG assistant over BPP's own content, with citations.**
A Cmd-K assistant that answers questions about the firm (services, case studies, methodology) by retrieving from the hub's own content and citing the exact page. Build: chunk the MDX at build time, embed each chunk, ship `embeddings.json` as a static asset (a consulting site is maybe 50-300 chunks, so a build-time embedded index beats a vector DB and is itself a flex). Worker embeds the question, cosine-ranks, calls Haiku 4.5 with top chunks + a system prompt that forbids answering outside context and requires citations (use Anthropic's Citations feature). Stream via SSE. **~$0.005-0.02/question, sub-second first token.** Lowest-risk, highest-use. Optional privacy-flex variant: run retrieval fully in-browser (transformers.js + Voy) so "your question's embedding never leaves your machine."

**3. Interactive in-browser demos of BPP's own tooling.**
Take real BPP tools (RAID-log generator, notes→action-items extractor, the PMO-automation/eval-harness) and let a visitor run them on their own input. Paste messy notes → get a structured RAID log streamed back, rendered as a real table, with the eval numbers shown next to it (recall 98%, 0 hallucinations). Build: each tool is one Worker route wrapping a tightly-scoped Claude call with **structured outputs** (`json_schema`) so the frontend renders real UI, not a wall of text. Haiku/Sonnet by task. **~$0.005-0.05/run.** Try-before-you-buy for a consulting firm; highest conversion intent. Only ship tools whose output you would put your name on.

### Tier 2 — supporting players (after the lead three)
- **Generative UI:** the assistant streams back rendered interactive widgets (cost slider, timeline, comparison card) via a `show_widget` tool, injected into a sandboxed iframe with strict CSP. Multiplier on feature 2. **~$0.02-0.05/answer.** Sandbox is non-negotiable (model-generated HTML).
- **Multi-agent / subagent orchestration visualized:** a coordinator fans out to specialist subagents shown as parallel lanes in a DAG. The technical ceiling and the most "can't fake this," but heavier infra and worse ROI per dollar than feature 1. **~$0.30-1.00+/run.** Gate behind a "request a deep demo" page; do not gold-plate the homepage with it.
- **Edge personalization:** Worker swaps hero copy/CTA by referrer/UTM/geo. This is conversion optimization, not a showpiece (the visitor can't see the AI). Use rule-based variants + occasional cached per-segment LLM copy. **Never** synchronous LLM rewriting per pageview (slow, costly, SEO-hostile).

### Skip (gimmicks that hurt the AI-native claim)
Bare floating chatbot bubble with no RAG/citations · per-pageview synchronous LLM personalization · fake "AI" badges or typing animations with no model behind them · free-form open agent runs on real systems from anonymous visitors.

---

## Revised phased rollout

The rebuild stays phased so each phase ships independently and the live site never breaks. **The visual rebuild (Phases 0-6) ships first and is free.** The AI layer (Phases 7-9) lands after, when cash allows.

### Phase 0 — Decisions + scaffolding (1 day)
- No Daunte gate. React/shadcn confirmed in. Scaffold `astro-rebuild` branch; current `main` keeps serving live.
- Review via local `astro dev` / `astro preview`. No staging URL until cutover.

### Phase 1 — Astro shell + design system (3-4 days)
- Astro + Tailwind v4 + MDX; shadcn init (Button/Dialog/Combobox/Sheet/Tabs/Accordion).
- **Build the design system here:** fluid `clamp()` type scale, two-font pairing self-hosted as WOFF2, 4px spacing tokens, single-accent palette as Tailwind theme tokens, FOUC-free cinematic dark mode, content-over-chrome defaults.
- `BaseLayout.astro` (head, OG, favicons, theme script, skip link), top nav, footer. Configure `site` + `base: '/bpp-tools'`.
- **Verify:** local preview serves a styled shell at `/bpp-tools/`; Lighthouse 95+.

### Phase 2 — Content migration (4-5 days)
- Content Collections schemas (pages, clients, departments, links, changelog).
- Migrate all 42 pages + the root acquisition deck from HTML to MDX, batches of 5-7. Front-matter: title, description, section, auto `lastUpdated`, optional OG image.
- Keep `data/hub-home-stats.json` + the Cloudflare Worker refresh as-is.
- Replace runtime-parse search with Pagefind (Cmd-K / `/`).
- **Verify:** visual parity across all pages; Pagefind returns full-text hits.

### Phase 3 — Interactive widgets to React islands (2 days)
- Meeting agenda (Checkbox + Textarea, localStorage), weekly scorecard + quarterly calc (Input + computed, formulas in a typed module), person filter (ToggleGroup, keeps `body[data-person]`).
- **Verify:** widgets work end-to-end; scorecard math matches current site.

### Phase 4 — Agency-grade motion + polish (4-5 days)
- Motion toolkit: GSAP scroll reveals + pins + SplitText headlines, Lenis (reduced-motion gated), Astro View Transitions with shared-element morphs, AutoAnimate on filters, one optional signature moment (video/Rive/Spline, lazy).
- Tier 1 craft applied everywhere; Tier 2 garnish on landing/section pages.
- The 15 v1 polish features: sidebar nav (Sheet on mobile), right-rail TOC scroll-spy, breadcrumbs, last-updated from git, OG metadata, favicon set, changelog + RSS, custom 404 to search, keyboard overlay (`?`), skip link + focus rings, Plausible + "was this helpful," View Transitions, link prefetch.
- **Verify:** Lighthouse perf 95+/a11y 100/best-practices 100/SEO 95+; all motion respects `prefers-reduced-motion`; CLS ~0.

### Phase 5 — CI/CD + docs (1 day)
- `ci.yml` (PRs): Biome, build, Pa11y-CI, Lighthouse CI, link check, html-validate. `deploy.yml` (main): build + `deploy-pages`. Switch Pages source to GitHub Actions. Update README, CLAUDE.md, contributing.md, getting-started.md.

### Phase 6 — Cutover, visual rebuild live (1 day)
- Final QA on local `astro preview`. Tag pre-rebuild `main` as `legacy-html-v1`. Merge `astro-rebuild` → `main`. Same URL. Watch first deploy.
- **At this point the site is jaw-dropping, agency-grade, and free. The visual win is banked.**

**Visual rebuild subtotal: ~16-19 dev days.**

### Phase 7 — AI spine + Worker hardening (2-3 days)
- Anthropic key on the Worker, SSE streaming, per-IP rate limiting + length caps, prompt caching, the build-time RAG embedded index pipeline.
- **Verify:** key never reaches the browser; rate limit holds; an end-to-end streamed Claude call works through the Worker.

### Phase 8 — The three lead AI features (5-8 days)
- Feature 2 (RAG assistant) first (lowest risk, most use), then Feature 3 (tool demos), then Feature 1 (live agent demo, the headline).
- **Verify:** assistant cites real pages and refuses out-of-context; tool demos return validated structured output rendered as UI; agent demo streams a real trace on sandboxed data; cost per run inside the modeled bounds.

### Phase 9 — Optional showpieces (follow-on)
- Generative UI widgets (sandboxed iframe + CSP), multi-agent visualized (behind a deep-demo page), edge personalization (rule-based + cached).

**AI layer subtotal: ~7-11 dev days on top of the visual rebuild.**

---

## Open decisions (down to two)

1. **Anthropic API budget for the Worker AI features.** Bounded and small (per-run cents, rate-limited), but it is a new recurring cost during a cash crunch. Recommendation: ship Phases 0-6 (free) first; turn the AI layer on when runway eases. The visual rebuild alone already clears the "jaw-dropping" bar.
2. **One signature spectacle moment, yes or no?** Tier 3 (custom cursor / WebGL hero) is optional and skippable. The plan assumes no, in favor of craft. Flip it on only if you want one lazy-loaded landing splash.

**Resolved since v1:** React/shadcn (yes), Daunte sign-off (not required).

**Maintenance note:** if Daunte edits the site day to day, MDX content edits stay no-code (add a file, fill front-matter). The React + AI layer routes through Eli/Claude.

---

## What's explicitly NOT in scope
From v1: no headless CMS, no auth, no hosting migration, Cloudflare Worker data-sync untouched, no mobile-app wrapper.
Added in v2: no free-form open agent runs (sandboxed + gated + rate-limited only), no real client data in any demo (synthetic fixtures only), no per-pageview synchronous LLM personalization, no WebGL as an LCP element.

---

## Macro verification before declaring done

**Visual (Phase 6):** Lighthouse perf ≥95 / a11y 100 / best-practices 100 / SEO ≥95 on local preview · Pagefind full-text hit · OG card renders in Slack · dark mode persists · `?` overlay opens · `/` palette instant · View Transitions feel instant · 3G load under 2s · Pa11y zero violations · new-contributor adds a page in ≤10 min from `contributing.md`.

**AI (Phase 8):** every model call is Worker-side (key never in browser, verified in network tab) · RAG assistant cites real pages and defers to a human when it lacks an answer · tool demos return schema-valid structured output · agent demo streams a visible reasoning trace and produces an artifact on synthetic data · rate limit + `max_tokens` ceilings hold under repeated hits · per-run cost inside the modeled bounds.
