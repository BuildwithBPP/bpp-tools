import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const hqRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactRoot = resolve(hqRoot, "artifacts");
const baseURL = process.env.HQ_BASE_URL ?? "http://127.0.0.1:4321";
const routes = ["/", "/performance/", "/growth/", "/delivery/", "/company/", "/library/"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "laptop", width: 1024, height: 900 },
  { name: "tablet", width: 768, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];

await mkdir(artifactRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    for (const route of routes) {
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
      assert.ok(response?.ok(), `${route} failed at ${viewport.width}px.`);
      const checks = await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        sideNavVisible: getComputedStyle(document.querySelector(".side-panel")).display !== "none",
        mobileNavVisible: getComputedStyle(document.querySelector(".mobile-navigation")).display !== "none"
      }));
      assert.equal(checks.h1, 1, `${route} has an invalid h1 count at ${viewport.width}px.`);
      assert.equal(checks.overflow, false, `${route} has horizontal page overflow at ${viewport.width}px.`);
      if (viewport.width > 900) assert.equal(checks.sideNavVisible, true, `Desktop nav missing at ${viewport.width}px.`);
      if (viewport.width <= 900) assert.equal(checks.mobileNavVisible, true, `Mobile nav missing at ${viewport.width}px.`);

      if (viewport.name === "desktop" || viewport.name === "mobile") {
        const accessibility = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          accessibility.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.length
          })),
          [],
          `${route} has WCAG A/AA violations at ${viewport.width}px.`
        );
      }
    }

    if (viewport.name === "desktop" || viewport.name === "mobile") {
      for (const target of [
        { route: "/", name: "today" },
        { route: "/company/", name: "company" }
      ]) {
        await page.goto(`${baseURL}${target.route}`, { waitUntil: "networkidle" });
        await page.screenshot({
          path: resolve(artifactRoot, `${target.name}-${viewport.name}.png`),
          fullPage: true
        });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(
  `Browser QA passed: ${routes.length} routes at 1440, 1024, 768, and 390px. ` +
  "WCAG A/AA checks passed at desktop and mobile. " +
  "Today and Company screenshots saved to artifacts/."
);
