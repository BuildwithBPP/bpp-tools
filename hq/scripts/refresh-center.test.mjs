import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const page = readFileSync(resolve(root, "src/pages/company/data-refresh.astro"), "utf8");
const browser = readFileSync(resolve(root, "public/scripts/refresh-center.js"), "utf8");

test("Refresh Center discovers live connector status before enabling controls", () => {
  assert.ok(page.includes("data-refresh-status"));
  assert.ok(page.includes("data-refresh-button"));
  assert.ok(browser.includes("/api/refresh/status"));
  assert.ok(browser.includes("button.disabled = !source.configured"));
});

test("Refresh Center shows snapshot success and failure evidence", () => {
  assert.ok(page.includes("data-refresh-evidence"));
  assert.ok(browser.includes("last_success_at"));
  assert.ok(browser.includes("last_error"));
});

test("Refresh Center explains missing setup and confirms preserved history", () => {
  assert.ok(browser.includes("configuration_reason"));
  assert.ok(browser.includes("/history?limit=1"));
  assert.ok(browser.includes("snapshots?.length"));
});
