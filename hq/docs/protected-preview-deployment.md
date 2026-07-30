# BPP HQ Protected Preview

**Status:** Cloudflare Pages project created, build validated, content intentionally not deployed  
**Project:** `bpp-hq-preview`  
**Reserved hostname:** `bpp-hq-preview.pages.dev`  
**Current production Hub:** unchanged

## Safety boundary

The preview remains empty until Cloudflare Access is configured and verified. The current BPP API token can manage Pages but cannot read or change Access applications, policies, or identity providers. This prevents an accidental public upload.

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

## Acceptance tests

After deployment:

1. An anonymous request redirects to Cloudflare Access and never returns site HTML.
2. Each approved owner can authenticate with Microsoft 365.
3. A non-approved identity is denied.
4. Today, Performance, Growth, Delivery, Company, and Library load after authentication.
5. Static assets load after authentication.
6. Responses include noindex, no-sniff, deny-framing, restricted-permissions, referrer, and content-security headers.
7. No write action or browser-delivered credential is present.

## Important limitation

This protected preview does not make the existing GitHub Pages Hub or its public repository private. The old surface remains unchanged until the three owners approve cutover. After approval, the migration plan must separately address the public/internal content split, repository visibility, redirects, and retirement of the old internal pages.

## References

- Cloudflare Pages direct upload: <https://developers.cloudflare.com/pages/get-started/direct-upload/>
- Cloudflare Pages Access behavior: <https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain>
- Cloudflare Access applications: <https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/>
- Microsoft Entra ID integration: <https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/entra-id/>
