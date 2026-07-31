# BPP HQ Protected Preview

**Status:** Deployed and verified behind Cloudflare Access on July 31, 2026
**Project:** `bpp-hq-preview`  
**Protected hostname:** `bpp-hq-preview.pages.dev`
**Current production Hub:** unchanged

## Safety boundary

The preview was deployed only after Cloudflare Access was configured and the repository verifier passed. The BPP API token now has the minimum Pages and Access permissions needed by the guarded command.

The deployment command fails closed unless it can verify all of the following:

1. A self-hosted Access application protects the exact preview hostname.
2. Microsoft Entra ID is the only allowed identity provider.
3. The Allow policy contains exactly the three active BPP owners.
4. No broad domain, group, everyone, IP, or service-token selector expands access.

The three approved users were resolved from the Microsoft 365 directory on July 30, 2026:

- Daunte Benjamin
- Kenny Hawkins
- Eli Fisher

Their email addresses are passed through `BPP_HQ_APPROVED_EMAILS` and are not stored in source control.

## Access configuration

Use Cloudflare Zero Trust to configure:

- Application type: Self-hosted
- Application name: BPP HQ Preview
- Public hostname: `bpp-hq-preview.pages.dev`
- Session duration: 12 hours
- Identity provider: Microsoft Entra ID only
- Automatic identity redirect: On
- Policy action: Allow
- Include: the three exact owner email addresses
- Default behavior: deny everyone else

Do not use an email-domain rule. Exact owner identities keep the preview deny-by-default.

The Cloudflare credential used for the Access setup needs:

- Access: Apps and Policies Write
- Access: Apps and Policies Read
- Access: Organizations, Identity Providers, and Groups Read

If Microsoft Entra ID is not yet connected, an authorized Microsoft administrator must create or approve the Entra application and complete the Cloudflare identity-provider setup. Do not substitute one-time PIN access for the approved Microsoft sign-in design.

## Deployment

From `hq/`, provide the Cloudflare credentials and a comma-separated list of the three directory-confirmed owner email addresses, then run:

```text
npm run deploy:protected-preview
```

The command rebuilds and validates the site, verifies the Access boundary through the Cloudflare API, and only then uploads the generated static files.

## July 31 current deployment evidence

- Astro check: 0 errors, 0 warnings, 0 hints
- Static build: 14 routes
- Validation and focused tests: 47 passed, 0 failed
- Access API verification: Microsoft Entra ID only, three exact owner emails, implicit default deny
- Pages deployment: `2274b646.bpp-hq-preview.pages.dev` from commit `7ebb9fe`
- Anonymous stable, generated, and same-origin API requests: HTTP 302 to Cloudflare Access
- Direct refresh Worker request: HTTP 403
- Pages Function: governed `/api/*` routes only, using private `REFRESH_SERVICE` binding
- Staging data resources: D1 `bpp-hq-staging-data` and R2 `bpp-hq-staging-snapshots`
- Scheduled service: `bpp-hq-refresh-staging` with daily and Monday Cron Triggers
- Approved-owner request: Daunte's Microsoft identity loaded the protected staging routes with HTTP 200 before the refresh extension
- Security headers: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, restrictive referrer and permissions policies
- Search indexing: `noindex, nofollow, noarchive` on every route
- Entra credential hygiene: two unused setup secrets deleted; the single active secret expires January 27, 2027

Repeat the live boundary check after every deployment:

```powershell
$env:HQ_DEPLOYMENT_URL = "https://<deployment-id>.bpp-hq-preview.pages.dev"
npm run verify:staging
Remove-Item Env:HQ_DEPLOYMENT_URL
```

The check requires HTTP 302 for the stable site, stable API, generated site, and generated API. It requires HTTP 403 from the Worker's direct API. Any public HTTP 200 result fails the check.

After the friendly hostname has a verified Access application, include it in the same check:

```powershell
$env:HQ_CUSTOM_URL = "https://hq-staging.buildwithbpp.com"
```

The July 31 first activation returned public HTTP 200, so the custom hostname was detached from Pages immediately. Its GoDaddy CNAME remains correct. Do not reattach it until an exact-owner Access application is ready and the custom checks return HTTP 302.

Kenny and Eli's owner acceptance and one observed non-owner denial remain operational acceptance checks. The exact-policy verifier already rejects extra emails and broad domain, group, everyone, IP, and service-token rules.

## Acceptance tests

After deployment:

1. An anonymous request redirects to Cloudflare Access and never returns site HTML.
2. Each approved owner can authenticate with Microsoft 365.
3. A non-approved identity is denied.
4. Today, Performance, Growth, Delivery, Company, Library, all department cockpits, Technical Landscape, and Data Refresh Center load after authentication.
5. Static assets load after authentication.
6. Responses include noindex, no-sniff, deny-framing, restricted-permissions, referrer, and content-security headers.
7. No write action or browser-delivered credential is present.
8. The authenticated Refresh Center loads connector status through the Pages service binding.

## Important limitation

This protected preview does not make the existing GitHub Pages Hub or its public repository private. The old surface remains unchanged until the three owners approve cutover. After approval, the migration plan must separately address the public/internal content split, repository visibility, redirects, and retirement of the old internal pages.

## References

- Cloudflare Pages direct upload: <https://developers.cloudflare.com/pages/get-started/direct-upload/>
- Cloudflare Pages Access behavior: <https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain>
- Cloudflare Access applications: <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/>
- Microsoft Entra ID integration: <https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/entra-id/>
