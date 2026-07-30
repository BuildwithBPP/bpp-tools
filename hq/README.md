# BPP HQ proof of concept

BPP HQ is a self-contained Astro static-site proof of concept for the next BPP internal command center. It contains six routes:

- `/` Today
- `/performance/`
- `/growth/`
- `/delivery/`
- `/company/`
- `/library/`

## Run locally

```sh
npm install
npm run dev
```

## Build and verify

```sh
npm run build
npm run validate
npm test
```

`npm test` performs a clean type check and static build, then validates the required routes, shared registry shape, internal links and anchors, one-H1 structure, brand wording, metric source/timeframe labels, and prohibited placeholder links.

Preview the built site:

```sh
npm run preview
```

Browser QA requires a local Chromium installation:

```sh
npx playwright install chromium
npm run preview -- --host 127.0.0.1
```

In a second terminal:

```sh
npm run screenshots
```

The browser check exercises every route at 1440, 1024, 768, and 390 pixels. It saves desktop and mobile screenshots for Today and Company in `artifacts/`.

## Architecture boundaries

- The HQ application owns only the `hq/` directory.
- Astro generates static HTML. No server runtime, framework island, production write, or client record mutation is included.
- `src/data/registries.ts` imports and validates the shared `../data/registry/pages.json`, `offers.json`, and `targets.json` files at build time. Those source registries remain read-only.
- `src/data/snapshot.ts` imports existing repository snapshots for representative BI and delivery views. It validates the fields the proof of concept uses.
- The current Hub HTML, CSS, JavaScript, and Worker remain outside this application and are not copied into the build.
- Registry source routes describe current-Hub records. Library maps them only to routes and anchors owned by this standalone proof of concept, so it does not create broken links.
- Authentication, access policies, live data refreshes, and audited write actions belong to later migration tiers.

## Main implementation surfaces

- `src/layouts/HQLayout.astro`: shared shell and page metadata
- `src/components/`: status, metric, action, source/freshness, document, section, data-state, navigation, and utility components
- `src/pages/`: six static routes
- `src/styles/global.css`: BPP design tokens, responsive behavior, visible focus, screen-share treatment, and print rules
- `scripts/validate.mjs`: static route, registry, content, and link validation
- `scripts/capture.mjs`: responsive browser checks and screenshot capture
- `docs/implementation-report.md`: delivered scope, evidence, limitations, and owner decisions
