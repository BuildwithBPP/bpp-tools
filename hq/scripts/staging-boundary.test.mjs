import assert from "node:assert/strict";
import test from "node:test";

let verifyStagingBoundary;
try {
  ({ verifyStagingBoundary } = await import("./verify-staging-boundary.mjs"));
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

const stableBase = "https://bpp-hq-preview.pages.dev";
const deploymentBase = "https://example-hash.bpp-hq-preview.pages.dev";
const workerBase = "https://bpp-hq-refresh-staging.example.workers.dev";

function protectedFetch(overrides = {}) {
  const statuses = new Map([
    [`${stableBase}/`, 302],
    [`${stableBase}/api/refresh/status`, 302],
    [`${deploymentBase}/`, 302],
    [`${deploymentBase}/api/refresh/status`, 302],
    [`${workerBase}/api/refresh/status`, 403],
    ...Object.entries(overrides)
  ]);

  return async (url) => new Response(null, { status: statuses.get(String(url)) ?? 404 });
}

test("staging boundary proves Pages and API require Access while the Worker fails closed", async () => {
  assert.equal(typeof verifyStagingBoundary, "function");

  const evidence = await verifyStagingBoundary({
    stableBase,
    deploymentBase,
    workerBase,
    fetchImpl: protectedFetch()
  });

  assert.deepEqual(evidence, [
    { name: "stable site", status: 302, expected: 302 },
    { name: "stable API", status: 302, expected: 302 },
    { name: "generated deployment", status: 302, expected: 302 },
    { name: "generated deployment API", status: 302, expected: 302 },
    { name: "direct refresh Worker", status: 403, expected: 403 }
  ]);
});

test("staging boundary rejects a publicly reachable generated deployment", async () => {
  await assert.rejects(
    verifyStagingBoundary({
      stableBase,
      deploymentBase,
      workerBase,
      fetchImpl: protectedFetch({ [`${deploymentBase}/`]: 200 })
    }),
    /generated deployment returned 200; expected 302/
  );
});

test("staging boundary requires a generated deployment URL", async () => {
  await assert.rejects(
    verifyStagingBoundary({
      stableBase,
      workerBase,
      fetchImpl: protectedFetch()
    }),
    /HQ_DEPLOYMENT_URL is required/
  );
});
