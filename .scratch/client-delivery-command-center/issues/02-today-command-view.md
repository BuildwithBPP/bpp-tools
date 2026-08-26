# Turn verified delivery work into a daily command view

Status: ready-for-agent

## What to build

Add the validated Legacy B/HALO snapshot and deterministic control engine, then replace the stale Delivery summary with a checkpoint-first Today route that shows readiness, latest-safe dates, next work, threats, control gaps, and pull-forward work.

## Acceptance criteria

- [ ] Snapshot rejects broken cross-references and preserves missing fields as gaps.
- [ ] Readiness and business-day calculations pass focused tests.
- [ ] Today satisfies UX-01 and UX-05 with exact Monday links.

## Blocked by

- 01

## Comments
