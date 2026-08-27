# Prove Monday task writes through a loopback-only adapter

Status: resolved

## What to build

Add a loopback-only development API that validates exact board membership, resolves live columns/owners at runtime, performs due-date/create/archive operations, reads the exact item back, and returns explicit confirmed/conflict/failed states. Add a reproducible snapshot builder without touching the disabled recap Worker.

## Acceptance criteria

- [x] Adapter binds only to `127.0.0.1` and refuses missing token or nonlocal Origin.
- [x] Fake API tests cover version conflict, mutation, read-back mismatch, archive, and upstream error evidence.
- [x] Public/static build contains no token or working mutation route and satisfies UX-08.

## Blocked by

- 03

## Comments

2026-08-27: Loopback adapter and deterministic refresh pipeline pass fake-upstream and static-boundary tests. Live Monday smoke mutation remains intentionally unrun because shared-board mutation was not authorized.
