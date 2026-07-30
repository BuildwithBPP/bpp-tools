# BPP Hub registries

These files are the shared content contract for the current Hub and the new BPP HQ proof of concept.

## Files

- `pages.json`: route, owner, lifecycle, confidentiality, source, and freshness metadata
- `offers.json`: approved and proposed offer pricing
- `targets.json`: canonical Business Plan targets by period and scenario

## Rules

1. Correct a governing fact here before copying it into an interface.
2. Approved, proposed, historical, and canonical are different states.
3. Historical documents are preserved but are not treated as current.
4. Every operational record needs a source and verification date.
5. Public outputs must use an explicit allowlist. These registries default to internal.

## Validation

The interim Hub automation and new BPP HQ build validate these JSON files before rendering.
