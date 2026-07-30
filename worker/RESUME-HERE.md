# Resume Here: Worker Containment Required

## Current branch status

Browser-to-Worker writes are disabled in this branch. pages/ops.html has no Worker URL or shared secret, so Save Recap and Save Decisions use the existing clipboard and Claude Code fallback.

This is local source containment only. No credential was rotated, no Worker was deployed, and no GitHub or Cloudflare setting was changed by this branch.

## External actions required before any restoration

1. Revoke or rotate the old Worker GitHub PAT outside the repository.
2. Rotate the old Worker shared secret outside the repository. Do not put a replacement in browser code.
3. Disable or replace the existing deployed Worker write routes until an authenticated design is approved.
4. Confirm a controlled request using the old shared secret returns HTTP 401 before sign-off. Do not record the secret value in a test, issue, log, or commit.
5. Keep direct browser writes disabled until Cloudflare Access identity validation, fixed destination allowlists, request validation, and audit logging are implemented.

## Local safeguards now in place

- The Worker validates week_of as an exact YYYY-MM-DD value before a recap path is constructed.
- The same validation is applied to decision saves so malformed dates cannot enter persisted decision data.
- The clipboard fallback remains the operational route while direct writes are disabled.

## Do not do

- Do not add a new shared secret to pages/ops.html.
- Do not paste a PAT or shared secret into chat, source, documentation, or browser storage.
- Do not re-enable the deployed Worker from this branch without the external containment actions and an owner-approved authenticated-write design.
