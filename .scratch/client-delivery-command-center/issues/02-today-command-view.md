# Turn verified delivery work into a daily command view

Status: resolved

## What to build

Add the validated Legacy B/HALO snapshot and deterministic control engine, then replace the stale Delivery summary with a checkpoint-first Today route that shows readiness, latest-safe dates, next work, threats, control gaps, and pull-forward work.

## Acceptance criteria

- [x] Snapshot rejects broken cross-references and preserves missing fields as gaps.
- [x] Readiness and business-day calculations pass focused tests.
- [x] Today satisfies UX-01 and UX-05 with exact Monday links.

## Blocked by

- 01

## Comments

2026-08-27: Shipped the checkpoint-first Today view over the validated two-project snapshot. Control tests, static contracts, and browser QA pass.
