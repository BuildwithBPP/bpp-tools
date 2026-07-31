# Friday connector activation

## Outcome

The BPP HQ staging refresh service connects six read-only data contracts, preserves every successful raw snapshot, keeps last-known-good data live after failures, and exposes owner-only manual refresh controls.

The code, D1 schema, encryption, and staging configuration are ready. Provider authorization remains an owner action because no API credential should be pasted into an AI chat or committed to GitHub.

## Current state

| Layer | State | Evidence |
|---|---|---|
| Direct connector code | Ready | QuickBooks, HubSpot, Monday, GitHub, and Workspace adapter tests pass |
| Metricool bridge | Ready, entitlement dependent | Governed gateway contract is tested; account API access still needs confirmation |
| D1 metadata | Live in staging | `bpp-hq-staging-data`, migrations 0001 and 0002 applied |
| R2 raw history | Blocked on account enablement | Enable R2 in Cloudflare, then create `bpp-hq-staging-snapshots` |
| Access protection | Stable Pages hostname protected | Worker application/audience and generated preview aliases still require verification |
| Browser controls | Ready but disabled | Controls query live status and enable only configured sources |

## Cloudflare first

1. In Cloudflare, open **R2 Object Storage** and enable R2 for the account.
2. In **Workers & Pages > bpp-hq-preview > Settings > General**, enable the preview access policy. Verify both the stable `pages.dev` hostname and a generated deployment hostname reject anonymous requests.
3. Add `hq-staging.buildwithbpp.com` as the staging Pages custom domain.
4. Protect that hostname with a Cloudflare Access self-hosted application using Microsoft Entra ID and exactly these three emails: Daunte, Kenny, and Eli at `@buildwithbpp.com`.
5. After the Worker deploys, route `hq-staging.buildwithbpp.com/api/*` to `bpp-hq-refresh-staging`. The page and API then share one hostname, login session, and Access audience.

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

After R2 exists and the Worker is deployed, run:

```powershell
cd "C:\Users\dtben\OneDrive - Business Plans Plus\BPP Operations\BPP Workspace\1. Internal Operations\8. Website Development\bpp-tools-codex\.worktrees\protected-preview\hq"
.\refresh-worker\configure-staging.ps1
```

The script prompts locally, uploads values with Wrangler, and does not write them to a file. Leave a prompt blank when that provider is not ready.

## Acceptance order

1. Status endpoint returns 403 anonymously.
2. An approved owner can load status through the protected staging hostname.
3. GitHub and Workspace refresh successfully with the GitHub App.
4. Monday refresh includes parent items and subitems.
5. HubSpot refresh includes pipeline definitions and all paginated deals.
6. QuickBooks refresh stores four reports; D1 contains ciphertext, never the refresh token.
7. Metricool refresh succeeds through the confirmed account route or remains visibly unavailable.
8. Force one failed pull and confirm the prior latest snapshot remains active.
9. Confirm history lists multiple snapshots after a second successful pull.
10. Only after all checks pass, set the HQ build to use the same-origin API and redeploy staging.
