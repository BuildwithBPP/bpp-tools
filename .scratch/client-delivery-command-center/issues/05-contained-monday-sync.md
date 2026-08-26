# Prove Monday task writes through a loopback-only adapter

Status: ready-for-agent

## What to build

Add a loopback-only development API that validates exact board membership, resolves live columns/owners at runtime, performs due-date/create/archive operations, reads the exact item back, and returns explicit confirmed/conflict/failed states. Add a reproducible snapshot builder without touching the disabled recap Worker.

## Acceptance criteria

- [ ] Adapter binds only to `127.0.0.1` and refuses missing token or nonlocal Origin.
- [ ] Fake API tests cover version conflict, mutation, read-back mismatch, archive, and upstream error evidence.
- [ ] Public/static build contains no token or working mutation route and satisfies UX-08.

## Blocked by

- 03

## Comments
