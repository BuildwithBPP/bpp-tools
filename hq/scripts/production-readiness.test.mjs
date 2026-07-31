import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let validateProductionConfiguration;
try {
  ({ validateProductionConfiguration } = await import("./production-readiness.mjs"));
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

const hqRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("production can launch securely on pages.dev without the custom domain", () => {
  assert.equal(typeof validateProductionConfiguration, "function");
  const result = validateProductionConfiguration({
    pagesConfig: readFileSync(join(hqRoot, "wrangler.production.example.toml"), "utf8"),
    workerConfig: readFileSync(join(hqRoot, "refresh-worker", "wrangler.example.toml"), "utf8")
  });

  assert.deepEqual(result, {
    pagesProject: "bpp-hq",
    workerName: "bpp-hq-refresh",
    refreshService: "bpp-hq-refresh",
    primaryOrigin: "https://bpp-hq.pages.dev",
    databaseName: "bpp-hq-data",
    bucketName: "bpp-hq-snapshots"
  });
});

test("production readiness rejects a custom-domain-only origin policy", () => {
  assert.throws(
    () =>
      validateProductionConfiguration({
        pagesConfig:
          'name = "bpp-hq"\nPUBLIC_HQ_ENVIRONMENT = "production"\nservice = "bpp-hq-refresh"',
        workerConfig:
          'name = "bpp-hq-refresh"\nALLOWED_ORIGINS = "https://hq.buildwithbpp.com"\n' +
          'database_name = "bpp-hq-data"\nbucket_name = "bpp-hq-snapshots"'
      }),
    /bpp-hq\.pages\.dev/
  );
});

test("production readiness rejects staging resources", () => {
  assert.throws(
    () =>
      validateProductionConfiguration({
        pagesConfig:
          'name = "bpp-hq"\nPUBLIC_HQ_ENVIRONMENT = "production"\nservice = "bpp-hq-refresh"',
        workerConfig:
          'name = "bpp-hq-refresh-staging"\nALLOWED_ORIGINS = "https://bpp-hq.pages.dev"\n' +
          'database_name = "bpp-hq-staging-data"\nbucket_name = "bpp-hq-staging-snapshots"'
      }),
    /staging resources/
  );
});
