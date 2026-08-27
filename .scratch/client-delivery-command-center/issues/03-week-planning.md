# Plan and adjust Monday-to-Sunday work safely

Status: resolved

## What to build

Add the Week route with seven-day task placement, checkpoint/review markers, collision warnings, pull-forward work, accessible Move/Add Task flows, and a mutation client that falls back to Monday when the local adapter is unavailable.

## Acceptance criteria

- [x] Week satisfies UX-02, UX-03, and UX-04.
- [x] Drag has a keyboard-equivalent Move action and confirmation preview.
- [x] Confirmed appears only after matching read-back; failure reverts and preserves a Monday link.

## Blocked by

- 02

## Comments

2026-08-27: Seven-day planning, Add Task defaults, accessible Move, impact preview, and safe Monday fallback passed automated browser and adapter tests.
