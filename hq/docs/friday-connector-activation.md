# Friday connector activation

## Outcome

The BPP HQ staging refresh service connects six read-only data contracts, preserves every successful raw snapshot, keeps last-known-good data live after failures, and exposes owner-only manual refresh controls.

The code, D1 schema, R2 history bucket, encryption, staging Worker, protected same-origin proxy, and scheduled triggers are live in staging. Provider authorization remains an owner action because no API credential should be pasted into an AI chat or committed to GitHub.

## Current state

| Layer | State | Evidence |
|---|---|---|
| Direct connector code | Ready | QuickBooks, HubSpot, Monday, GitHub, and Workspace adapter tests pass |
| Metricool bridge | Ready, entitlement dependent | Governed gateway contract is tested; account API access still needs confirmation |
| D1 metadata | Live in staging | `bpp-hq-staging-data`, migrations 0001 and 0002 applied |
| R2 raw history | Live in staging | `bpp-hq-staging-snapshots`, Standard storage class |
| Refresh Worker | Live in staging | `bpp-hq-refresh-staging`, two Cron Triggers, direct anonymous request returns 403 |
| Access protection | Stable and generated Pages hostnames protected | Anonymous page and API requests return 302 to Access; exact-policy API reinspection needs an Access-read token |
| Same-origin API | Live in staging | Pages Function uses private `REFRESH_SERVICE` binding to the Worker |
| Browser controls | Live, connector-gated | Protected controls name missing configuration, enable only ready sources, and verify preserved history after each successful manual refresh |
| Friendly hostname | DNS ready, detached fail-closed | GoDaddy CNAME is correct, but Cloudflare Access rejected the domain because it is not a Cloudflare zone; keep the protected Pages hostname unless owners approve authoritative-DNS migration |

## Cloudflare first

1. Completed: R2 is enabled and `bpp-hq-staging-snapshots` exists.
2. Completed: Pages Preview Access is enabled; stable, generated, and API URLs redirect anonymous requests to Access.
3. Completed: `bpp-hq-refresh-staging` is deployed with D1, R2, two schedules, an Access audience, an exact-owner allowlist, and an encryption key.
4. Completed: the Pages Function sends governed `/api/*` requests to the Worker through the private `REFRESH_SERVICE` binding.
5. Completed: GoDaddy CNAME `hq-staging` points to `bpp-hq-preview.pages.dev`.
6. Completed safety response: the custom hostname was detached after an activation test returned public HTTP 200.
7. Blocked by architecture, not credentials: Cloudflare Access returned error `12130`, `domain does not belong to zone`, for `hq-staging.buildwithbpp.com`. Keep the hostname detached. The recommended staging URL remains `bpp-hq-preview.pages.dev`; onboard authoritative DNS only after an owner-approved DNS-record audit and migration plan.

If authoritative DNS is later onboarded, verify the custom-domain policy with `BPP_HQ_PROTECTED_DOMAIN=hq-staging.buildwithbpp.com` plus the existing Cloudflare verification environment variables before enabling the browser controls.

Do not point the Worker at production storage and do not add a broad `@buildwithbpp.com` allow rule.

## Provider authorization

### HubSpot

Create a HubSpot Service Key named `BPP HQ Read-Only` under **Settings > Integrations > Service Keys**. Service Keys are HubSpot's current path for single-account system-to-system reporting and are intended to replace legacy credentials for this use case. Grant exactly one scope: `crm.objects.deals.read`. HubSpot documents that scope for deal retrieval, and it also authorizes the deal-pipeline read used by this adapter. Do not grant deal write, delete, workflow, marketing-send, contact, company, or user-management scopes. Store the key as `HUBSPOT_ACCESS_TOKEN`; the Worker sends it as a Bearer token.

Official scope reference: <https://developers.hubspot.com/docs/api-reference/latest/crm/objects/deals/guide>

Official Service Key reference: <https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys>

Acceptance check: pipelines and all paginated deals load; no source-system record changes.

### Monday.com

Monday personal API tokens inherit everything the issuing user can do in the Monday interface. Use a dedicated user restricted to the three governed boards if the plan permits it. Otherwise use Daunte's token for staging, document the inherited access, and replace it with a dedicated integration identity before production. Store it as `MONDAY_ACCESS_TOKEN`.

The governed boards are BPP Operations (`18406003425`), Client Projects (`18406004595`), and Client Overview (`18406004600`). The adapter contains GraphQL queries only, follows item pagination, and includes subitems.

Official permission reference: <https://developer.monday.com/api-reference/docs/authentication>

### QuickBooks Online

Create or use an Intuit app with `com.intuit.quickbooks.accounting`. Intuit does not offer a narrower read-only accounting OAuth scope, so BPP compensates with a GET-only connector, isolated Worker secret, separate staging data, and no accounting write routes. Authorize the BPP company and capture client ID, client secret, realm ID, and one bootstrap refresh token. The Worker exchanges it for short-lived access tokens and encrypts every rotated refresh token in D1 using AES-GCM.

The initial reports are Profit and Loss, Balance Sheet, Cash Flow, and Aged Receivables on the cash basis. The connector never writes an accounting transaction.

Official scope reference: <https://developer.intuit.com/app/developer/qbo/docs/learn/scopes>

### GitHub and BPP Workspace

Preferred method: create a GitHub App named `BPP HQ Read-Only`, owned by BuildwithBPP. Grant repository **Contents: read-only** and **Metadata: read-only**, subscribe to no webhooks, and install it only on `bpp-tools` plus the private `bpp-workspace` repository. Store the App ID, installation ID, and private-key PEM. The Worker mints short-lived installation tokens at refresh time.

Do not reuse a developer's GitHub CLI token. A fine-grained PAT is only a time-boxed fallback.

The GitHub contract inventories the app's selected repositories. The Workspace contract reads `_claude/data/current-week.md` from `BuildwithBPP/bpp-workspace` on `main`.

Official permission reference: <https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app>

### Metricool

BPP's current plan can use Metricool MCP but cannot use Metricool's custom API, which is restricted to Advanced and Custom plans. Because a Cloudflare Worker cannot run an interactive MCP session on schedule, keep Metricool visibly unavailable until one of these is approved: upgrade for API access, or run a governed scheduled export bridge that produces the same snapshot envelope. Do not label Metricool connected until a real staging pull succeeds.

Official plan reference: <https://help.metricool.com/plans-add-ons-and-api-access-explained-xux1u>

## Safe secret upload

To authorize provider credentials locally, run:

```powershell
cd "C:\Users\dtben\OneDrive - Business Plans Plus\BPP Operations\BPP Workspace\1. Internal Operations\8. Website Development\bpp-tools-codex\.worktrees\protected-preview\hq"
.\refresh-worker\configure-staging.ps1
```

The script prompts locally, uploads values with Wrangler, and does not write them to a file. Leave a prompt blank when that provider is not ready. The protected Refresh Center then shows the exact missing configuration names without returning any secret value.

The script inspects existing Worker secret names before prompting. It preserves `ACCESS_AUD` and `CREDENTIAL_ENCRYPTION_KEY` during ordinary connector additions, so adding HubSpot or Monday later cannot invalidate encrypted rotating credentials. Use `-InitializeInfrastructure` only for a new environment with missing infrastructure secrets; even then, existing values are never overwritten.

## Acceptance order

1. Complete: the direct Worker status endpoint returns 403 anonymously, and the Pages API redirects to Access.
2. An approved owner can load status through the protected staging hostname and sees an exact setup reason for every disabled connector.
3. GitHub and Workspace refresh successfully with the GitHub App.
4. Monday refresh includes parent items and subitems.
5. HubSpot refresh includes pipeline definitions and all paginated deals.
6. QuickBooks refresh stores four reports; D1 contains ciphertext, never the refresh token.
7. Metricool refresh succeeds through the confirmed account route or remains visibly unavailable.
8. Force one failed pull and confirm the prior latest snapshot remains active.
9. Confirm the first manual refresh reports `Historical snapshot verified`, then confirm history lists multiple snapshots after a second successful pull.
10. Only after all checks pass, set the HQ build to use the same-origin API and redeploy staging.
