# BPP HQ refresh service

This Worker is the production foundation for scheduled and owner-initiated data refreshes. It is intentionally not deployed until the staging D1 database, R2 bucket, Access audience, exact origin, and connector gateways are configured.

## Data path

1. Cloudflare Access authenticates the request.
2. The Worker verifies the Access JWT and exact three-owner allowlist.
3. A connector gateway returns a versioned JSON envelope with `captured_at` and `records`.
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

## Activation sequence

1. Create separate staging D1 and R2 resources.
2. Apply `migrations/0001_refresh_history.sql`.
3. Copy `wrangler.example.toml` to an environment-owned deployment config and insert non-secret binding IDs.
4. Store connector tokens and Access configuration as Cloudflare secrets or protected variables.
5. Test one source in staging, including a failed pull that proves last-known-good behavior.
6. Connect the staging HQ UI.
7. Repeat with separate production resources after owner approval.

Official references: Cloudflare Cron Triggers, D1 bindings, R2 bindings, and Access JWT validation.
