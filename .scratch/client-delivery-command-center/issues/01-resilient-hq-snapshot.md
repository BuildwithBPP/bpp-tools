# Make HQ source drift fail visibly, not crash

Status: resolved

## What to build

Make the existing HQ accept the current lean home snapshot without inventing retired values. Missing business metrics must render as unavailable or derive from their own verified dataset, and the untouched baseline build must return green before command-center work begins.

## Acceptance criteria

- [x] Current `hub-home-stats.json` parses without restoring removed fields.
- [x] Performance/Growth never calculate from null or display fabricated zero values.
- [x] `npm test` passes on the current source files.

## Blocked by

None - can start immediately.

## Comments

Root cause confirmed 2026-08-26: automated refresh commit `556cd44` narrowed the JSON shape while the Astro Zod contract remained strict.

2026-08-26: Missing fields now parse as null, Performance derives YTD actuals from its own monthly dataset, unavailable comparisons are labeled, and `npm test` passes with all six baseline routes validated.
