# BPP HQ environments

BPP HQ uses one GitHub codebase and separate deployment environments.

## Local development

Feature work runs locally from a branch. Local work can use fixture or staging data only. It does not receive production credentials.

## Private staging

`bpp-hq-preview.pages.dev` is the protected review environment. It is where responsive, accessibility, security, content, migration, and refresh behavior is verified before an approved merge. Staging receives separate D1, R2, and connector configuration when the refresh service is activated.

The target integrated staging hostname is `hq-staging.buildwithbpp.com`. Pages serves the application while the refresh Worker owns `/api/*` on the same hostname. This avoids cross-origin credential behavior and lets one Cloudflare Access application protect both the page and API. The existing `pages.dev` address remains a build-review alias, not the final integration boundary.

Cloudflare Pages creates separate hash and branch preview aliases. Those preview URLs are public by default even when the stable project domain has its own Access application. The Pages project setting **Settings > General > Enable access policy** must be enabled before a preview URL is treated as private or shared with the team. Verify both the stable domain and a generated preview URL after every protection change.

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
