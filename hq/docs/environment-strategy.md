# BPP HQ environments

BPP HQ uses one GitHub codebase and separate deployment environments.

## Local development

Feature work runs locally from a branch. Local work can use fixture or staging data only. It does not receive production credentials.

## Private staging

`bpp-hq-preview.pages.dev` is the protected review environment. It is where responsive, accessibility, security, content, migration, and refresh behavior is verified before an approved merge. Staging receives separate D1, R2, and connector configuration when the refresh service is activated.

## Private production

The intended production address is `hq.buildwithbpp.com`. Production remains undeployed until owner cutover approval. It receives separate storage, secrets, Access configuration, and deployment history. The current Hub stays available until the replacement passes the cutover checklist.

## Release path

1. Build on a feature branch.
2. Publish the branch to private staging.
3. Run automated and visual checks.
4. Review the 72-file migration inventory and any data changes.
5. Merge the approved pull request.
6. Deploy production from the approved branch.
7. Keep rollback to the previous production deployment available.

Cloudflare Pages preview deployments support branch and pull-request review without changing the production domain. BPP keeps the existing staging project separate during migration because it is already protected and verified.
