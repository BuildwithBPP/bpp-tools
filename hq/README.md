# BPP HQ proof of concept

BPP HQ is a self-contained Astro static-site proof of concept for the next BPP internal command center. It contains ten routes:

- `/` Today
- `/performance/`
- `/growth/`
- `/delivery/` Today delivery command
- `/delivery/week/` Monday-to-Sunday work plan
- `/delivery/timeline/` baseline and forecast Gantt
- `/delivery/projects/` project controls
- `/delivery/raid/` risks, assumptions, issues, and dependencies
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

`npm test` runs the delivery control, snapshot, client, and loopback adapter tests, performs a clean type check and static build, then validates all routes, internal links, source metadata, and delivery contracts.

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

The browser check exercises every route at 1440, 1024, 768, 390, and 320 pixels. It checks console errors, page overflow, delivery dialogs, task defaults, checkpoint impact, and WCAG A/AA. It saves desktop and mobile screenshots for all delivery views in `artifacts/`.

## Client delivery data and Monday writes

The hosted static build is read-only. It contains no Monday token and no working mutation URL. Task cards always retain a direct Monday source link.

Refresh the checked-in Monday snapshot from a terminal-only token:

```sh
MONDAY_API_TOKEN='<set in shell only>' npm run delivery:refresh
npm run delivery:check
```

Run the contained write adapter locally in one terminal:

```sh
MONDAY_API_TOKEN='<set in shell only>' npm run dev:delivery-api
```

Run the HQ against it in a second terminal:

```sh
npm run dev:delivery
```

The adapter binds only to `127.0.0.1`, accepts the configured `http://127.0.0.1:4321` origin, validates the exact Client Delivery board and approved project group, resolves live Monday columns and owners, then reads the changed item back. The UI can show `confirmed` only when that read-back matches. Add `DELIVERY_HQ_ORIGIN` only when the local HQ origin intentionally changes.

No live create, move, or archive smoke test is part of the automated suite. That test changes the shared Monday board and needs explicit approval of the exact temporary subitem and cleanup action.

## Architecture boundaries

- The HQ application owns only the `hq/` directory.
- Astro generates static HTML. The hosted artifact has no server runtime or production write route. The optional development adapter is a separate loopback-only process.
- `src/data/registries.ts` imports and validates the shared `../data/registry/pages.json`, `offers.json`, and `targets.json` files at build time. Those source registries remain read-only.
- `src/data/snapshot.ts` imports existing repository snapshots for representative BI and delivery views. It validates the fields the proof of concept uses.
- The current Hub HTML, CSS, JavaScript, and Worker remain outside this application and are not copied into the build.
- Registry source routes describe current-Hub records. Library maps them only to routes and anchors owned by this standalone proof of concept, so it does not create broken links.
- Authentication and hosted audited write actions remain later migration tiers. This release remains local-only.
- Canonical Montserrat, Merriweather, and Poppins font files are bundled at build time. The site does not make runtime font or image requests to external hosts.

## Main implementation surfaces

- `src/layouts/HQLayout.astro`: shared shell and page metadata
- `src/components/`: status, metric, action, source/freshness, document, section, data-state, navigation, and utility components
- `src/pages/`: ten static routes
- `src/domain/delivery/`: validated delivery model, readiness, KPI, collision, latest-safe, and gap calculations
- `src/components/delivery/`: Today, Week, Gantt, project, and RAID interface pieces
- `scripts/delivery-dev-api.mjs`: loopback-only Monday mutation adapter with verified read-back
- `scripts/build-delivery-snapshot.mjs`: deterministic live/fixture snapshot refresh
- `src/styles/global.css`: BPP design tokens, responsive behavior, visible focus, screen-share treatment, and print rules
- `public/brand/bpp-b-mark.png`: local copy of the canonical transparent BPP mark used in the product shell
- `scripts/validate.mjs`: static route, registry, content, and link validation
- `scripts/capture.mjs`: responsive browser checks and screenshot capture
- `docs/implementation-report.md`: delivered scope, evidence, limitations, and owner decisions
