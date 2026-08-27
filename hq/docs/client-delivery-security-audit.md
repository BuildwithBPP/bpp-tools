# Client Delivery Command Center security audit

**Audit date:** 2026-08-27

**Release target:** public legacy GitHub Pages Hub, read-only, no sign-in
**Verdict:** PUBLIC DATA-EXPOSURE RISK ACCEPTED; PASS for read-only browser boundary

The static dashboard contains client delivery information and has no sign-in layer. Eli explicitly approved publishing that snapshot to the older public BPP Tool Hub on 2026-08-27. This acceptance does not authorize public Monday writes: mutations remain available only through a separate loopback process that requires a server-side token and an exact allowed browser origin.

## 1. Secrets and configuration

| Check | Verdict | Evidence |
|---|---|---|
| No hardcoded credentials | PASS | Repository scan found no Monday token or credential value. |
| Environment files excluded | PASS | `.gitignore` excludes `.env` and `.env.*` while retaining `.env.example`. |
| Browser receives no token | PASS | The public variable is only the local API URL; the token is read by the Node process. |
| No secret logging | PASS | Upstream failures are bounded to status and the first 500 response characters; request headers are not logged. |
| Production source maps | PASS | No source-map publishing is configured. |
| Missing token fails closed | PASS | The mutation process exits before listening when `MONDAY_API_TOKEN` is absent. |

## 2. Data storage

| Check | Verdict | Evidence |
|---|---|---|
| Database permissions, tenant isolation, and row policies | N/A | This feature has no database. |
| Client data exposure | ACCEPTED RISK | The built static files publicly expose the committed Legacy B and HALO delivery snapshot by explicit owner direction. |

## 3. Authentication and authorization

| Check | Verdict | Evidence |
|---|---|---|
| User authentication | ACCEPTED RISK | Sign-in was explicitly deferred and the no-sign-in legacy-Hub release was explicitly approved. |
| Mutation authorization | PARTIAL | The adapter validates the exact board, group, item, owner, and expected update timestamp, but it does not authenticate a human user. Containment is loopback plus exact-origin CORS. |
| Least-privilege operations | PASS | Only create subitem, change due date, and archive subitem are implemented. Delete is not implemented. |
| Optimistic concurrency and read-back | PASS | Mutations require `expectedUpdatedAt` and are confirmed only after a matching Monday read-back. |

## 4. Input and output safety

| Check | Verdict | Evidence |
|---|---|---|
| Request validation | PASS | Method, route, body size, JSON shape, board, group, date, status, owner, and source record are validated. |
| Cross-project writes | PASS | Create requests require an exact allowed project/group pair and an approved parent deliverable. |
| XSS handling | PASS | Astro escapes rendered values; no `set:html`, `innerHTML`, or equivalent unsafe rendering is used. |
| Mutation methods | PASS | Writes use POST/PATCH routes; no state-changing GET exists. |
| Error disclosure | PASS for local release | Responses expose a bounded upstream diagnostic required for local troubleshooting, not credentials or headers. This endpoint must remain private. |

## 5. Dependencies and build chain

| Check | Verdict | Evidence |
|---|---|---|
| Dependency audit | PASS | Full and production-only `npm audit` report zero vulnerabilities. |
| Lockfile | PASS | `package-lock.json` is committed and used. |
| Package scope | PASS | Dependencies are limited to the Astro build, schema validation, date utilities, accessibility checks, and browser QA. |

## 6. Abuse and rate controls

| Check | Verdict | Evidence |
|---|---|---|
| Public rate limiting | N/A for local release | The API listens only on `127.0.0.1`. Rate limiting becomes mandatory before any network exposure. |
| Request size | PASS | JSON bodies are capped before parsing. |
| Destructive bulk operations | PASS | No delete or bulk mutation route exists. |

## 7. Browser boundary

| Check | Verdict | Evidence |
|---|---|---|
| CORS | PASS | Browser access is limited to one exact configured origin; wildcard origin and credentialed CORS are not used. |
| Static fallback | PASS | With no local adapter URL, mutation controls remain read-only and link to Monday. |

## 8. File uploads

All file-upload checks are N/A. The command center does not accept files.

## Requirements before any write-enabled or private-data release

1. Protect all client-delivery routes with authenticated, authorized access.
2. Move Monday writes to an authenticated server boundary with user-level authorization, audit logging, and rate limiting.
3. Stop embedding the full client snapshot in publicly retrievable static assets.
4. Repeat this audit against the actual hosting and identity configuration.

Until all four are verified, this release must remain a public read-only snapshot with no browser mutation route or credential.
