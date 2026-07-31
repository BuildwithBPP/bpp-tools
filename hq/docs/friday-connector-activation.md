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
| Browser controls | Live, connector-gated | Controls query live status and enable only sources with configured credentials |
| Friendly hostname | DNS ready, detached fail-closed | GoDaddy CNAME is correct; create exact-owner Access first, then reattach and require HTTP 302 |

## Cloudflare first

1. Completed: R2 is enabled and `bpp-hq-staging-snapshots` exists.
2. Completed: Pages Preview Access is enabled; stable, generated, and API URLs redirect anonymous requests to Access.
3. Completed: `bpp-hq-refresh-staging` is deployed with D1, R2, two schedules, an Access audience, an exact-owner allowlist, and an encryption key.
4. Completed: the Pages Function sends governed `/api/*` requests to the Worker through the private `REFRESH_SERVICE` binding.
5. Completed: GoDaddy CNAME `hq-staging` points to `bpp-hq-preview.pages.dev`.
6. Completed safety response: the custom hostname was detached after an activation test returned public HTTP 200.
7. Pending: create a Cloudflare Access self-hosted application for `hq-staging.buildwithbpp.com` using Microsoft Entra ID and exactly Daunte, Kenny, and Eli. Only then reattach the Pages custom hostname and require an anonymous HTTP 302 before sharing it.

Verify the custom-domain policy with `BPP_HQ_PROTECTED_DOMAIN=hq-staging.buildwithbpp.com` plus the existing Cloudflare verification environment variables before enabling the browser controls.

Do not point the Worker at production storage and do not add a broad `@buildwithbpp.com` allow rule.

## Provider authorization

### HubSpot

Create a BPP private app with read-only deal and pipeline access. Do not grant write, delete, workflow, marketing-send, or user-management scopes. Store its token as `HUBSPOT_ACCESS_TOKEN`.

Acceptance check: pipelines and all paginated deals load; no source-system record changes.

### Monday.com

Monday API tokens inherit the permissions of the issuing user. Use a dedicated read-only user if the plan permits it. Otherwise use Daunte's token for staging, document the inheritance, and replace it with a dedicated integration identity before production. Store it as `MONDAY_ACCESS_TOKEN`.

The governed boards are BPP Operations, Client Projects, and Client Overview. The adapter follows item pagination and includes subitems.

### QuickBooks Online

Create or use an Intuit app with the QuickBooks Accounting scope. Authorize the BPP company and capture client ID, client secret, realm ID, and one bootstrap refresh token. The Worker exchanges it for short-lived access tokens and encrypts every rotated refresh token in D1 using AES-GCM.

The initial reports are Profit and Loss, Balance Sheet, Cash Flow, and Aged Receivables on the cash basis. The connector never writes an accounting transaction.

### GitHub and BPP Workspace

Preferred method: create a GitHub App owned by BuildwithBPP, grant repository **Contents: read-only** and **Metadata: read-only**, and install it only on the repositories HQ needs. Store the App ID, installation ID, and private-key PEM. The Worker mints short-lived installation tokens at refresh time.

Do not reuse a developer's GitHub CLI token. A fine-grained PAT is only a time-boxed fallback.

The GitHub contract inventories the app's selected repositories. The Workspace contract reads `_claude/data/current-week.md` from `BuildwithBPP/bpp-workspace` on `main`.

### Metricool

Confirm whether BPP's Metricool plan exposes its API and the exact account endpoint. If it does, configure a narrow read-only gateway and store the gateway URL/token. If it does not, use a scheduled CSV/export bridge into the same snapshot envelope. Do not label Metricool connected until a real staging pull succeeds.

## Safe secret upload

To authorize provider credentials locally, run:

```powershell
cd "C:\Users\dtben\OneDrive - Business Plans Plus\BPP Operations\BPP Workspace\1. Internal Operations\8. Website Development\bpp-tools-codex\.worktrees\protected-preview\hq"
.\refresh-worker\configure-staging.ps1
```

The script prompts locally, uploads values with Wrangler, and does not write them to a file. Leave a prompt blank when that provider is not ready.

## Acceptance order

1. Complete: the direct Worker status endpoint returns 403 anonymously, and the Pages API redirects to Access.
2. An approved owner can load status through the protected staging hostname.
3. GitHub and Workspace refresh successfully with the GitHub App.
4. Monday refresh includes parent items and subitems.
5. HubSpot refresh includes pipeline definitions and all paginated deals.
6. QuickBooks refresh stores four reports; D1 contains ciphertext, never the refresh token.
7. Metricool refresh succeeds through the confirmed account route or remains visibly unavailable.
8. Force one failed pull and confirm the prior latest snapshot remains active.
9. Confirm history lists multiple snapshots after a second successful pull.
10. Only after all checks pass, set the HQ build to use the same-origin API and redeploy staging.
