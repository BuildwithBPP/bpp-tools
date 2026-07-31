# BPP HQ proof of concept

BPP HQ is the protected Astro foundation for the next BPP internal command center. The six primary sections remain stable while governed detail routes are added beneath them:

- `/` Today
- `/performance/`
- `/growth/`
- `/delivery/`
- `/company/`
- `/library/`

Company also owns the six department cockpits, Technical Landscape, and Data Refresh Center.

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

`npm test` performs a clean type check and 14-route static build, then validates the required routes, shared registries, exact 71-file catalog coverage, proposed routing, internal links and anchors, one-H1 structure, CSP rules, metric source/timeframe labels, refresh behavior, and the protected same-origin API boundary.

After a staging deployment, verify that the stable site, generated deployment, Pages API, and direct Worker still fail closed:

```powershell
$env:HQ_DEPLOYMENT_URL = "https://<deployment-id>.bpp-hq-preview.pages.dev"
npm run verify:staging
Remove-Item Env:HQ_DEPLOYMENT_URL
```

Set `HQ_CUSTOM_URL=https://hq-staging.buildwithbpp.com` only after `buildwithbpp.com` is an active Cloudflare zone and that hostname has its own verified Access application. The check then requires the friendly site and API to redirect to Access too. Until the DNS architecture changes, use the protected `bpp-hq-preview.pages.dev` hostname.

Pull requests that change `hq/` or the shared registries automatically run the same build and tests, audit production dependencies, and package the Worker without deploying it.

`npm run verify:production-config` confirms that production can launch on protected `bpp-hq.pages.dev`, uses a separate Worker, D1 database, and R2 bucket, and does not depend on the deferred custom domain.

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

The browser check exercises every route at 1440, 1024, 768, and 390 pixels. It saves review screenshots for Today, Company, Performance, Library, and the Refresh Center in `artifacts/`.

## Architecture boundaries

- The HQ application owns only the `hq/` directory.
- Astro generates static HTML. No server runtime, framework island, production write, or client record mutation is included.
- `src/data/registries.ts` imports and validates the shared `../data/registry/pages.json`, `offers.json`, and `targets.json` files at build time. Those source registries remain read-only.
- `src/data/snapshot.ts` imports existing repository snapshots for representative BI and delivery views. It validates the fields the proof of concept uses.
- The current Hub HTML, CSS, JavaScript, and Worker remain outside this application and are not copied into the build.
- Registry source routes describe current-Hub records. Library maps them only to routes and anchors owned by this standalone proof of concept, so it does not create broken links.
- Cloudflare Access protects the stable staging hostname, generated deployments, and the Pages API route.
- The refresh service lives in `refresh-worker/`. Staging D1, R2, encryption, schedules, and the Worker are live. Provider-specific refreshes remain disabled until their read-only credentials are authorized locally.
- `functions/api/[[path]].js` exposes only governed refresh routes and calls the Worker through the private `REFRESH_SERVICE` binding. The browser receives no reusable Worker credential.
- `src/data/page-catalog.json` inventories all 71 HTML source artifacts with proposed routing and migration decisions for owner review.
- Local, private staging, and private production use one codebase with separate deployment and data configuration. See `docs/environment-strategy.md`.
- Canonical Montserrat, Merriweather, and Poppins font files are bundled at build time. The site does not make runtime font or image requests to external hosts.

## Main implementation surfaces

- `src/layouts/HQLayout.astro`: shared shell and page metadata
- `src/components/`: status, metric, action, source/freshness, document, section, data-state, navigation, and utility components
- `src/pages/`: six primary routes plus six department cockpits, Technical Landscape, and Data Refresh Center
- `src/styles/global.css`: BPP design tokens, responsive behavior, visible focus, screen-share treatment, and print rules
- `public/brand/bpp-b-mark.png`: local copy of the canonical transparent BPP mark used in the product shell
- `scripts/validate.mjs`: static route, registry, content, and link validation
- `scripts/capture.mjs`: responsive browser checks and screenshot capture
- `scripts/verify-staging-boundary.mjs`: live fail-closed check for stable, generated, API, and Worker staging URLs
- `docs/information-architecture.md`: navigation contract, congestion guardrails, content disposition, system boundaries, and adoption triggers
- `docs/environment-strategy.md`: local, staging, production, and preview-access boundaries
- `docs/implementation-report.md`: delivered scope, evidence, limitations, and owner decisions
