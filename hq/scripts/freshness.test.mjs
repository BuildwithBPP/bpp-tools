import assert from "node:assert/strict";
import test from "node:test";
import { deriveFreshness } from "../src/data/freshness.ts";

test("marks an operating snapshot stale as calendar time advances", () => {
  const result = deriveFreshness(
    { status: "live", verified: "2026-07-13", freshnessDays: 7 },
    "2026-07-31"
  );
  assert.equal(result.state, "stale");
  assert.equal(result.ageDays, 18);
  assert.equal(result.detail, "Stale by 11 days");
});

test("keeps a record current while it remains inside its threshold", () => {
  const result = deriveFreshness(
    { status: "canonical", verified: "2026-07-29", freshnessDays: 30 },
    "2026-07-31"
  );
  assert.equal(result.state, "current");
  assert.equal(result.ageDays, 2);
});

test("treats historical records as historical instead of stale", () => {
  const result = deriveFreshness(
    { status: "historical", verified: "2025-01-01", freshnessDays: null },
    "2026-07-31"
  );
  assert.equal(result.state, "historical");
});

test("reports an unavailable freshness state when no threshold exists", () => {
  const result = deriveFreshness(
    { status: "live", verified: "2026-07-29", freshnessDays: null },
    "2026-07-31"
  );
  assert.equal(result.state, "unavailable");
});

test("rejects impossible calendar dates", () => {
  assert.throws(
    () => deriveFreshness(
      { status: "live", verified: "2026-02-30", freshnessDays: 7 },
      "2026-07-31"
    ),
    /Invalid verification date/
  );
});
