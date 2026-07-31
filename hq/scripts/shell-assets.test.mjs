import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("the built HQ shell declares a favicon that resolves in the static output", () => {
  const html = readFileSync(resolve(root, "dist/index.html"), "utf8");
  const match = html.match(/<link rel="icon"[^>]+href="([^"]+)"/);

  assert.ok(match, "The HQ shell must declare a favicon.");
  assert.equal(match[1], "/brand/bpp-b-mark.png");
  assert.equal(existsSync(resolve(root, "dist", match[1].slice(1))), true);
});
