import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const hqRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactRoot = resolve(hqRoot, "artifacts");
const baseURL = process.env.HQ_BASE_URL ?? "http://127.0.0.1:4321";
const routes = ["/", "/performance/", "/growth/", "/delivery/", "/delivery/week/", "/delivery/timeline/", "/delivery/projects/", "/delivery/raid/", "/company/", "/library/"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "laptop", width: 1024, height: 900 },
  { name: "tablet", width: 768, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "mobile-small", width: 320, height: 720 }
];

await mkdir(artifactRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
    for (const route of routes) {
      browserErrors.length = 0;
      const response = await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
      assert.ok(response?.ok(), `${route} failed at ${viewport.width}px.`);
      const checks = await page.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        sideNavVisible: getComputedStyle(document.querySelector(".side-panel")).display !== "none",
        mobileNavVisible: getComputedStyle(document.querySelector(".mobile-navigation")).display !== "none",
        utilitySourceVisible: getComputedStyle(document.querySelector(".utility-source")).display !== "none",
        utilityFreshnessVisible: getComputedStyle(document.querySelector(".utility-freshness")).display !== "none"
      }));
      assert.equal(checks.h1, 1, `${route} has an invalid h1 count at ${viewport.width}px.`);
      assert.equal(checks.overflow, false, `${route} has horizontal page overflow at ${viewport.width}px.`);
      if (viewport.width > 900) assert.equal(checks.sideNavVisible, true, `Desktop nav missing at ${viewport.width}px.`);
      if (viewport.width <= 900) assert.equal(checks.mobileNavVisible, true, `Mobile nav missing at ${viewport.width}px.`);
      assert.equal(checks.utilitySourceVisible, true, `Utility source missing at ${viewport.width}px.`);
      assert.equal(checks.utilityFreshnessVisible, true, `Utility freshness missing at ${viewport.width}px.`);
      assert.deepEqual(browserErrors, [], `${route} logged browser errors at ${viewport.width}px.`);

      if (route === "/delivery/week/") {
        await page.locator(".add-task").click();
        assert.equal(await page.locator("#add-task-dialog").evaluate((dialog) => dialog.open), true, "Add Task dialog did not open.");
        const addDefaults = await page.locator("#add-task-dialog").evaluate((dialog) => ({
          owner: dialog.querySelector('[name="owner"]').value,
          status: dialog.querySelector('[name="status"]').value,
          dueDate: dialog.querySelector('[name="dueDate"]').value,
          parentRequired: dialog.querySelector('[name="deliverableId"]').required
        }));
        assert.deepEqual(addDefaults, { owner: "Eli Fisher", status: "not-started", dueDate: "2026-08-27", parentRequired: true }, "Add Task defaults drifted.");
        await page.locator("#add-task-dialog button[value='cancel']").click();
        const move = page.locator("[data-move-task]").first();
        await move.click();
        assert.equal(await page.locator("#move-task-dialog").evaluate((dialog) => dialog.open), true, "Move dialog did not open.");
        assert.notEqual(await page.locator("[data-move-latest-safe]").textContent(), "Unavailable", "Move preview is missing latest-safe context.");
        await page.locator("#move-task-dialog input[name='dueDate']").fill("2026-08-29");
        await page.locator("#move-task-dialog input[name='dueDate']").dispatchEvent("change");
        assert.match(await page.locator("[data-move-checkpoint]").textContent(), /after the latest-safe date/i, "Move preview did not flag checkpoint impact.");
        await page.locator("#move-task-dialog button[value='cancel']").click();
      }

      if (route === "/delivery/timeline/") {
        assert.ok(await page.locator(".gantt-checkpoint-marker").count() > 0, "Timeline has no checkpoint markers.");
        assert.equal(await page.locator(".gantt-checkpoint-marker[draggable='true']").count(), 0, "Checkpoint markers must not be draggable.");
      }

      if (viewport.name === "desktop" || viewport.name === "mobile" || viewport.name === "mobile-small") {
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
        { route: "/delivery/", name: "delivery-today" },
        { route: "/delivery/week/", name: "delivery-week" },
        { route: "/delivery/timeline/", name: "delivery-timeline" },
        { route: "/delivery/projects/", name: "delivery-projects" },
        { route: "/delivery/raid/", name: "delivery-raid" }
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
  `Browser QA passed: ${routes.length} routes at 1440, 1024, 768, 390, and 320px. ` +
  "WCAG A/AA checks passed at desktop, mobile, and small mobile. " +
  "Today and all delivery screenshots saved to artifacts/."
);
