# BPP Hub Security Containment Report

**Date:** 2026-07-29
**Branch:** audit/hub-security
**Scope:** Local code containment only. No credential, GitHub, Cloudflare, Worker, or deployment state was changed.

## Changes made

1. Browser Worker configuration disabled:
   - pages/ops.html now sets both Worker configuration variables to empty strings.
   - The existing Save Recap and Save Decisions fallback therefore opens the clipboard and Claude Code workflow.
   - No replacement credential was added.

2. Recap and decision date validation added:
   - worker/src/index.js now validates week_of with the anchored pattern ^\\d{4}-\\d{2}-\\d{2}$ and a UTC calendar round-trip check.
   - Both save-recap and save-decisions reject malformed values with HTTP 400 before any GitHub request or recap-path construction.
   - This blocks slash, traversal-shaped, extension-suffixed, non-zero-padded, impossible month/day, and non-leap-year February 29 inputs.

3. Worker handoff note corrected:
   - worker/RESUME-HERE.md now states that browser writes are disabled in this branch.
   - It requires external shared-secret and PAT rotation before any restoration.
   - It requires a controlled old-secret HTTP 401 result before sign-off.

4. Deterministic regression harness added:
   - worker/test/week-of-validation.test.mjs imports and executes the real Worker module using Node VM modules.
   - It verifies malformed recap and decision dates return HTTP 400 without reaching the GitHub fetch layer.
   - It verifies impossible month/day values and a non-leap-year February 29 are rejected on both routes.
   - It verifies a valid leap-day date retains the existing GitHub read/write flow on both routes.

## Test evidence

Red phase, before validation:

- Recap traversal-shaped week_of returned HTTP 500 after the harness blocked an attempted GitHub call. Expected HTTP 400.
- Decision traversal-shaped week_of returned HTTP 500 after the harness blocked an attempted GitHub call. Expected HTTP 400.
- Impossible date 2026-02-30 matched the shape regex, reached the recap GitHub flow, and returned HTTP 500. Expected HTTP 400.

Green phase, after validation:

- node --experimental-vm-modules worker/test/week-of-validation.test.mjs
  - Passed. Node emits only its standard VM Modules experimental warning.
- node --check worker/src/index.js
  - Passed.
- Node parsing of the inline script in pages/ops.html
  - Passed. One inline script parsed successfully.
- Browser fallback configuration check
  - Passed. Both Worker configuration variables are empty and both clipboard fallback functions remain present.
- Secret-pattern check on every changed tracked file
  - Passed. No non-empty Worker secret assignment or GitHub PAT-formatted value was found.

## External actions still required

1. Revoke or rotate the old Worker GitHub PAT outside the repository.
2. Rotate the old Worker shared secret outside the repository.
3. Disable or replace the currently deployed Worker write routes. This branch does not deploy.
4. Confirm a controlled request using the old shared secret returns HTTP 401. Do not record the secret in source, chat, logs, or commits.
5. Keep browser writes disabled until the Cloudflare Access migration supplies identity validation, fixed destination allowlists, request validation, rate limiting, and audit logging.
6. Make the internal repository and Hub private or protected before relying on this code change as a confidentiality control.

## Limits

This local branch prevents the public page from supplying the old credential after it is merged and deployed. It cannot revoke a credential already distributed through public history, disable the currently live Worker, remove raw GitHub exposure, or protect existing GitHub Pages without authorized external actions.
