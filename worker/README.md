# bpp-recap-worker

A 5-minute Cloudflare Worker that lets the Hub save data from the browser. **Save only — no email send.** Email goes out from Claude Code via the ms365 MCP, same way the personal morning brief does.

## Why this is small on purpose

Daunte's personal pattern: action checklist saves to Cloudflare; emails come from Claude Code. The Monday recap mirrors that.

```
Browser (ops.html)
   ↓ POST /save-recap
Cloudflare Worker
   ↓ commit
GitHub repo (bpp-tools)
   ↓ Daunte runs /monday-recap when ready
Claude Code + ms365 MCP
   ↓ send-mail
Outlook (3 BPP owner inboxes)
```

No Microsoft Graph App Registration. No Azure admin consent. No client secrets to rotate. Just a GitHub PAT and a bearer token.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | health check |
| POST | `/save-recap` | append decisions + write recap markdown |
| POST | `/save-decisions` | append decisions only |

All POSTs need `Authorization: Bearer <SHARED_SECRET>`.

## One-time setup (5 min)

### 1. Wrangler CLI

```powershell
npm install -g wrangler
wrangler login   # opens browser, sign in to your Cloudflare account
```

Free tier covers this Worker forever.

### 2. GitHub fine-grained PAT

github.com → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token

- Name: `bpp-recap-worker`
- Expiration: 1 year
- Repository access: **Only select repositories** → `BuildwithBPP/bpp-tools`
- Repository permissions:
  - **Contents**: Read and write
  - **Metadata**: Read (auto)

Copy the token value.

### 3. Push secrets

```powershell
cd "C:\Users\dtben\Developer\bpp-tools\worker"

# Generate a shared bearer token
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
$secret  # save this — paste into ops.html in step 5

# Push to Cloudflare
wrangler secret put SHARED_SECRET    # paste $secret
wrangler secret put GITHUB_TOKEN     # paste fine-grained PAT
```

### 4. Deploy

```powershell
wrangler deploy
```

You'll get a URL like `https://bpp-recap-worker.<subdomain>.workers.dev`. Note it.

### 5. Wire ops.html

Edit `pages/ops.html`. Near the top of the script section, set:

```js
var RECAP_WORKER_URL = "https://bpp-recap-worker.<your-subdomain>.workers.dev";
var RECAP_WORKER_SECRET = "<the SHARED_SECRET you generated>";
```

Commit + push. The next time the Hub loads, the meeting buttons will use the Worker.

### 6. Test

```powershell
# Health check
curl https://bpp-recap-worker.<sub>.workers.dev/health

# Test save-recap
curl -X POST https://bpp-recap-worker.<sub>.workers.dev/save-recap `
  -H "Authorization: Bearer <SECRET>" `
  -H "Content-Type: application/json" `
  -d '{
    "week_of": "2026-05-11",
    "north_star": "Test recap",
    "decisions": [{"decision": "Test decision", "owner": "Daunte", "due_date": "2026-05-18"}],
    "commits": {"Daunte": {"strategic": "Ship the Worker"}}
  }'
```

Expected response:
```json
{
  "ok": true,
  "decisions_committed": 1,
  "recap_path": "data/monday-recaps/2026-05-11.md",
  "next_step": "In Claude Code, run: /monday-recap 2026-05-11"
}
```

Check the `bpp-tools` repo `main` branch — `data/monday-decisions.json` and `data/monday-recaps/2026-05-11.md` should both have new commits.

## Daily flow after setup

After a Monday CEO meeting:

1. Click **Save Decisions** on ops.html → decisions commit instantly via Worker
2. Click **Send Recap** on ops.html → recap markdown commits instantly via Worker (you don't need to do anything else for the team to see it on the Hub)
3. To email the team, in Claude Code: `/monday-recap` — reads the saved markdown, sends via ms365 MCP

If you'd rather the email go automatically: schedule a Routine that fires Monday at 6pm: "Run /monday-recap, send to BPP owners." It checks for the saved recap; if no file for today, no-op.

## Local dev

```powershell
wrangler dev
# Worker runs at http://localhost:8787
```

Set ops.html's `RECAP_WORKER_URL` to `http://localhost:8787` for local testing.

## Costs

- Worker: free tier (100K req/day, we use ~5/week).
- GitHub API: free, 5000 req/hour authenticated.
- **Total: $0/month.**

## Updating the Worker

```powershell
cd "C:\Users\dtben\Developer\bpp-tools\worker"
# edit src/index.js
wrangler deploy
```

## What this Worker doesn't do

- No email send. That's Claude Code's job (matches personal brief).
- No QuickBooks, HubSpot, or Monday access. Those are pulled by the Sunday Routine via Connector MCPs.
- No state of its own. Stateless. Just a thin wrapper over the GitHub API.
