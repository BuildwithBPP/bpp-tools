import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let isAllowedOrigin;
try {
  ({ isAllowedOrigin } = await import("../refresh-worker/index.mjs"));
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

test("origin policy accepts either exact protected staging hostname", () => {
  assert.equal(typeof isAllowedOrigin, "function");
  const configured = "https://bpp-hq-preview.pages.dev, https://hq-staging.buildwithbpp.com";

  assert.equal(isAllowedOrigin("https://bpp-hq-preview.pages.dev", configured), true);
  assert.equal(isAllowedOrigin("https://hq-staging.buildwithbpp.com", configured), true);
});

test("origin policy rejects lookalikes and missing configuration", () => {
  const configured = "https://bpp-hq-preview.pages.dev,https://hq-staging.buildwithbpp.com";

  assert.equal(isAllowedOrigin("https://hq-staging.buildwithbpp.com.attacker.test", configured), false);
  assert.equal(isAllowedOrigin("http://hq-staging.buildwithbpp.com", configured), false);
  assert.equal(isAllowedOrigin("https://hq-staging.buildwithbpp.com", ""), false);
  assert.equal(isAllowedOrigin(null, configured), false);
});

test("staging configuration rejects the detached custom hostname", () => {
  const hqRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const config = readFileSync(join(hqRoot, "refresh-worker", "wrangler.staging.toml"), "utf8");
  const configured = config.match(/^ALLOWED_ORIGINS\s*=\s*"([^"]+)"/m)?.[1] ?? "";

  assert.equal(isAllowedOrigin("https://bpp-hq-preview.pages.dev", configured), true);
  assert.equal(isAllowedOrigin("https://hq-staging.buildwithbpp.com", configured), false);
});
