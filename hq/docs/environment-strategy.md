# BPP HQ environments

BPP HQ uses one GitHub codebase and separate deployment environments.

## Local development

Feature work runs locally from a branch. Local work can use fixture or staging data only. It does not receive production credentials.

## Private staging

`bpp-hq-preview.pages.dev` is the protected review and current integration environment. It is where responsive, accessibility, security, content, migration, and refresh behavior is verified before an approved merge. Staging has separate D1 and R2 resources plus a separately deployed refresh Worker.

Pages serves the application and a narrow Pages Function owns `/api/*`. That Function calls `bpp-hq-refresh-staging` through the private `REFRESH_SERVICE` service binding. The browser therefore stays on one protected hostname and sends no reusable Worker credential. The refresh Worker remains separate so Cloudflare Cron Triggers can run scheduled pulls.

The friendly staging hostname is `hq-staging.buildwithbpp.com`. It has been added to the Pages project, and GoDaddy DNS now resolves CNAME `hq-staging` to `bpp-hq-preview.pages.dev`; Cloudflare certificate and hostname validation are still pending. Because `buildwithbpp.com` DNS is not hosted in Cloudflare, a normal Cloudflare Worker route cannot own `/api/*`; the Pages Function and service binding are the governed same-origin boundary instead. The Worker origin allowlist includes both exact staging hostnames. Protect the custom hostname with its own exact-owner Access application before treating it as available.

Cloudflare Pages creates separate hash and branch preview aliases. The Pages project setting **Settings > General > Enable access policy** is enabled. On July 31, 2026, anonymous requests to the stable domain, the generated deployment domain, and the same-origin API all returned HTTP 302 to Cloudflare Access. Reverify both URL types after every protection change.

## Private production

The intended production address is `hq.buildwithbpp.com`. Production remains undeployed until owner cutover approval. It receives separate storage, secrets, Access configuration, and deployment history. The current Hub stays available until the replacement passes the cutover checklist.

## Release path

1. Build on a feature branch.
2. Confirm the stable domain and all preview aliases are protected.
3. Publish the branch to private staging.
4. Run automated and visual checks.
5. Review the 72-file migration inventory and any data changes.
6. Merge the approved pull request.
7. Deploy production from the approved branch.
8. Keep rollback to the previous production deployment available.

Cloudflare Pages preview deployments support branch and pull-request review without changing the production domain. BPP keeps the staging project separate during migration. A deployment is not considered protected until both the stable hostname and the generated preview hostname reject anonymous requests.

Official reference: <https://developers.cloudflare.com/pages/configuration/preview-deployments/>
