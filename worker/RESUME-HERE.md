# Resume Here — Worker Token Fix Needed

**Status as of 2026-05-10:** Cloudflare Worker is deployed and live at `https://bpp-recap-worker.buildwithbpp.workers.dev`. Worker auth (SHARED_SECRET) is correct. The only remaining issue is the GitHub PAT — it has read access but write attempts return 403 "Resource not accessible by personal access token" despite the UI claiming Contents is "Read and write."

## Root cause

The current PAT was created and then **regenerated** (in response to the org's 366-day-lifetime restriction). GitHub has a known bug where regenerating a fine-grained PAT preserves the UI-displayed permissions but doesn't update the underlying stored grant. The token authenticates as `bpp-admin` (verified by `/user` endpoint) and `bpp-admin` has full admin permissions on `bpp-tools` (verified by `/repos/.../bpp-tools` — admin: true, push: true). User-level perms are fine. Token-level perms are stuck on read-only.

## Fix (takes ~90 seconds)

### 1. Delete the broken token

1. Open: https://github.com/settings/personal-access-tokens
2. Find `bpp-recap-worker` (the regenerated one, expiration ~Aug 2026)
3. Click into it → click the red **Delete** button at the bottom → confirm

### 2. Create a fresh new fine-grained PAT (not regenerate)

1. From the same page, click **Generate new token** (top right)
2. Fill in:
   - **Token name:** `bpp-recap-worker-v2`
   - **Expiration:** 90 days (org max is 366 days; pick anything ≤ that)
   - **Resource owner:** BuildwithBPP
   - **Repository access:** "Only select repositories" → `bpp-tools`
   - **Repository permissions:**
     - **Contents:** Read and write
     - (Metadata: Read auto-selects)
3. Click **Generate token** → copy the `github_pat_...` value

### 3. Send the new value to Claude

Paste it back in chat. Claude will:
- Update `worker/.env`
- Push to Cloudflare via `wrangler secret put GITHUB_TOKEN`
- Re-run the E2E test
- If green, re-enable the Worker URL in `pages/ops.html`
- Push so the Hub is 1-click again

## What was tested and works

- ✅ Cloudflare Worker deployed and live (`bpp-recap-worker.buildwithbpp.workers.dev`)
- ✅ `SHARED_SECRET` correctly bound (auth works after `printf` fix that bypassed Windows CRLF issue)
- ✅ Worker handler executes (gets past auth, reaches GitHub API call)
- ✅ Read-only GitHub API calls succeed (GET on `monday-decisions.json` returns 200)
- ✅ Org policy: fine-grained PATs allowed, no admin approval required
- ✅ `bpp-admin` user has admin/push perms on `bpp-tools` repo

## What's NOT working

- ❌ Token write capability — GitHub returns 403 "Resource not accessible by personal access token" on PUT despite UI showing Contents: Read and write

## What's currently in place (so nothing's broken)

- `pages/ops.html` Worker URL/secret temporarily blanked → "Save Recap" + "Save Decisions" buttons fall back to Claude Code paste flow (clean UX, no error popups)
- `worker/.env` has the live values for both secrets — delete and rewrite once new token arrives
- Worker on Cloudflare side stays exactly as-is; only the GITHUB_TOKEN secret needs replacement

## Files touched while diagnosing

- `worker/src/index.js` — final save-only version (no MS Graph)
- `worker/wrangler.toml` — minimal config
- `worker/README.md` — setup walkthrough
- `worker/.env` — local mirror of secrets (gitignored)
- `pages/ops.html` — Worker integration with clean fallback to Claude Code paste

No skill changes since the simplification commit. The next push will be the re-enable of `pages/ops.html` after the token is fixed.
