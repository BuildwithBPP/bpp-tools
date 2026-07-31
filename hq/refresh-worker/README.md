# BPP HQ refresh service

This Worker is the production foundation for scheduled and owner-initiated data refreshes. The staging D1 database and schema are live. Deployment still requires the account's R2 feature to be enabled, the history bucket to be created, and a protected same-origin API route to be configured.

## Data path

1. Cloudflare Access authenticates the request.
2. The Worker verifies the Access JWT and exact three-owner allowlist.
3. A read-only source adapter returns a versioned JSON envelope with `captured_at` and `records`.
4. The raw response is written to R2 history.
5. D1 atomically adds snapshot metadata and advances the source's latest pointer.
6. If any pull or validation step fails, the prior latest snapshot remains active and the failure is recorded.

Scheduled refresh uses the same path with `system:schedule` as the actor. Cloudflare Cron Triggers execute in UTC, so the production schedule must be chosen with that behavior in mind.

## API

- `GET /api/refresh/status`
- `POST /api/refresh/:source`
- `GET /api/data/:source/latest`
- `GET /api/data/:source/history?limit=20`

All endpoints are private. Manual refresh also requires an exact allowed origin. No browser-delivered system credential is used.

## Connector boundary

- QuickBooks Online uses OAuth refresh, pulls four accounting reports, and stores rotated refresh tokens encrypted with AES-GCM in D1.
- HubSpot reads pipelines and paginated deals.
- Monday reads the governed boards, paginated items, and subitems with GraphQL queries only.
- GitHub preferably uses a GitHub App and short-lived installation tokens. A fine-grained token is supported only as a staging fallback.
- BPP Workspace reads the current-week brief from the private workspace repository using the same GitHub authentication boundary.
- Metricool uses a governed snapshot gateway until BPP's API entitlement and endpoint contract are confirmed.

Source-system writes are outside this service's scope.

## Network boundary

The intended staging hostname is `hq-staging.buildwithbpp.com`. Pages serves the application and the Worker owns only `/api/*` on that hostname. This preserves same-origin browser requests and lets one Cloudflare Access application protect both surfaces. The `workers.dev` hostname is not the team-facing API.

## Activation sequence

1. Enable R2 and create `bpp-hq-staging-snapshots`.
2. Deploy with `wrangler.staging.toml`. D1 `bpp-hq-staging-data` and both migrations already exist.
3. Add the staging custom hostname and protect it with the exact three-owner Access policy.
4. Route `/api/*` on the staging hostname to this Worker and set its Access audience.
5. Run `configure-staging.ps1` to upload provider credentials without storing them locally.
6. Test each source, including a failed pull that proves last-known-good behavior.
7. Build HQ with `PUBLIC_REFRESH_API_URL=.` and deploy staging.
8. Repeat with separate production resources after owner approval.

The complete owner checklist is in `docs/friday-connector-activation.md`.

Official references: Cloudflare Cron Triggers, D1 bindings, R2 bindings, and Access JWT validation.
