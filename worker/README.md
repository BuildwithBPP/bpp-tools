# bpp-recap-worker

Cloudflare Worker that takes the friction out of the Monday CEO recap. Browser POSTs decisions + commits → Worker sends the HTML email via Microsoft Graph and commits decisions to GitHub. **No Claude Code required for the recap flow.**

## Endpoints

- `POST /send-recap` — sends HTML recap email + commits decisions JSON + writes recap markdown
- `POST /save-decisions` — commits decisions only (no email)
- `GET /` — health check

All POST endpoints require `Authorization: Bearer <SHARED_SECRET>` header.

## One-time setup

### 1. Cloudflare account + Wrangler CLI

```powershell
# Install Wrangler (Cloudflare's CLI)
npm install -g wrangler

# Sign in (opens browser)
wrangler login
```

Free tier covers this Worker forever (100K req/day; we'll use ~5/week).

### 2. Microsoft Graph app registration (for sending email)

In Azure portal (using daunte@buildwithbpp.com or admin account):

1. Azure Active Directory → App registrations → **New registration**
2. Name: `bpp-recap-worker`
3. Supported account types: **Single tenant**
4. Redirect URI: leave blank
5. Click Register
6. Note the **Application (client) ID** and **Directory (tenant) ID** — you'll need these
7. Certificates & secrets → **New client secret** → 24 months → copy the **Value** (only shown once)
8. API permissions → **Add a permission** → Microsoft Graph → **Application permissions** → search `Mail.Send` → check it → Add
9. **Grant admin consent for [tenant]** ← critical, without this the Worker gets 403

### 3. GitHub fine-grained PAT

1. github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Name: `bpp-recap-worker`
3. Expiration: 1 year
4. Repository access: **Only select repositories** → `BuildwithBPP/bpp-tools`
5. Repository permissions:
   - **Contents**: Read and write
   - **Metadata**: Read (auto)
6. Generate token → copy the value

### 4. Push secrets to the Worker

From `worker/` directory:

```powershell
cd "C:\Users\dtben\Developer\bpp-tools\worker"

# Generate a shared secret (the bearer token ops.html will send)
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
$secret  # save this — you'll paste it into ops.html

# Push secrets
wrangler secret put SHARED_SECRET           # paste $secret
wrangler secret put GITHUB_TOKEN            # paste fine-grained PAT
wrangler secret put GRAPH_TENANT_ID         # paste tenant id from step 2
wrangler secret put GRAPH_CLIENT_ID         # paste client id
wrangler secret put GRAPH_CLIENT_SECRET     # paste client secret value
wrangler secret put GRAPH_SENDER_UPN        # paste daunte@buildwithbpp.com
```

### 5. Deploy

```powershell
wrangler deploy
```

You'll get a URL like `https://bpp-recap-worker.<subdomain>.workers.dev`. Note this — ops.html needs it.

### 6. Wire ops.html

In `pages/ops.html`, find the constants near the top of the script and set:

```js
const RECAP_WORKER_URL = "https://bpp-recap-worker.<your-subdomain>.workers.dev";
const RECAP_WORKER_SECRET = "<the SHARED_SECRET you generated>";
```

Note: the secret IS exposed in the page source. That's fine for an internal-only tool — Daunte/Kenny/Eli are the only people with the Hub URL, and the Worker also enforces `Access-Control-Allow-Origin` to the GitHub Pages domain. Rotate quarterly.

For higher security: put ops.html behind Cloudflare Access with M365 SSO; the Worker can verify the access JWT instead of a bearer token.

### 7. Test

```powershell
# Health check
curl https://bpp-recap-worker.<sub>.workers.dev/health

# Test send-recap (replace SECRET)
curl -X POST https://bpp-recap-worker.<sub>.workers.dev/send-recap `
  -H "Authorization: Bearer <SECRET>" `
  -H "Content-Type: application/json" `
  -d '{
    "week_of": "2026-05-11",
    "north_star": "Test recap",
    "decisions": [{"decision": "Test decision", "owner": "Daunte", "due_date": "2026-05-18"}],
    "commits": {"Daunte": {"strategic": "Ship the Worker"}}
  }'
```

If success, check daunte@buildwithbpp.com (and the other two BPP inboxes) for the test email. Also check that `data/monday-decisions.json` got a new entry on `main`.

## Local dev

```powershell
wrangler dev
# Worker runs at http://localhost:8787
```

Set ops.html's `RECAP_WORKER_URL` to `http://localhost:8787` for local testing.

## Costs

Worker: free tier (100K requests/day, we use ~5/week).
MS Graph: free, no per-call charge for Mail.Send under business tenant.
GitHub API: free, 5000 requests/hour authenticated.

**Total ongoing cost: $0.**

## What this Worker does NOT do

- Does not auto-fire on a schedule. The Sunday brief generation still runs as a Routine via `/monday-prep`. This Worker is purely the recap flow (post-meeting button click).
- Does not access HubSpot, QuickBooks, or Monday. Those are still pulled by the Sunday Routine via Connector MCPs.
- Does not store any data of its own. Stateless. Reads/writes through GitHub.
- Does not send to recipients other than the three BPP owner inboxes (set in `wrangler.toml` vars). To override, change `DEFAULT_TO_EMAILS`.

## Updating the Worker

```powershell
cd "C:\Users\dtben\Developer\bpp-tools\worker"
# edit src/index.js
wrangler deploy
```

Deploy is instant (~10s). No restart needed for the Hub.
