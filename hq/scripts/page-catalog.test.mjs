import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { departmentForPage } from "../src/data/page-routing.mjs";

const hqRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(hqRoot, "..");
const catalogPath = join(hqRoot, "src", "data", "page-catalog.json");

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith(".html") ? [path] : [];
  });
}

function sourcePages() {
  return [
    join(repoRoot, "index.html"),
    join(repoRoot, "bpp-client-acquisition-strategy.html"),
    ...htmlFiles(join(repoRoot, "pages")),
    ...htmlFiles(join(repoRoot, "client-guides")),
    join(repoRoot, "scripts", "performance-dashboard", "template.html")
  ].map((path) => relative(repoRoot, path).replaceAll("\\", "/"));
}

test("catalogs every current and historical Hub page exactly once", () => {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const catalogPaths = catalog.pages.map((page) => page.source_path);
  assert.deepEqual(
    catalogPaths.toSorted(),
    sourcePages().toSorted(),
    "The migration catalog must match the actual Hub page inventory."
  );
  assert.equal(new Set(catalogPaths).size, catalogPaths.length, "A Hub page is cataloged more than once.");
});

test("gives every HTML artifact a proposed destination and migration decision", () => {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const sections = new Set(["today", "performance", "growth", "delivery", "company", "library"]);
  const lifecycle = new Set(["canonical", "live", "draft", "proposed", "historical", "archived"]);
  const migration = new Set(["native", "carry-forward", "historical", "retire-after-cutover"]);

  for (const page of catalog.pages) {
    assert.ok(page.id, `${page.source_path} is missing an id.`);
    assert.ok(page.title, `${page.source_path} is missing a title.`);
    assert.ok(page.description, `${page.source_path} is missing a description.`);
    assert.ok(page.owner, `${page.source_path} is missing an owner.`);
    assert.ok(page.confidentiality, `${page.source_path} is missing a confidentiality class.`);
    assert.ok(sections.has(page.section), `${page.source_path} has an invalid HQ section.`);
    assert.ok(lifecycle.has(page.status), `${page.source_path} has an invalid lifecycle.`);
    assert.ok(migration.has(page.migration), `${page.source_path} has no migration decision.`);
  }
});

test("keeps superseded quarterly pages historical and the Business Plan canonical", () => {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const byPath = new Map(catalog.pages.map((page) => [page.source_path, page]));
  assert.equal(byPath.get("pages/business-plan.html")?.status, "canonical");
  assert.equal(byPath.get("pages/strategic-plan.html")?.status, "historical");
  for (const path of sourcePages().filter((path) => path.includes("pages/_archive/"))) {
    assert.equal(byPath.get(path)?.status, "archived", `${path} must remain visibly archived.`);
  }
});

test("gives every HTML artifact a proposed department for owner review", () => {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const departments = new Set([
    "Sales & Business Development",
    "Marketing & Content",
    "Client Delivery & Design",
    "Finance & Operations",
    "AI Workforce & Tech",
    "HR & People Ops",
    "Company-wide"
  ]);
  for (const page of catalog.pages) {
    assert.ok(departments.has(departmentForPage(page)), `${page.id} has no valid proposed department.`);
  }
});
