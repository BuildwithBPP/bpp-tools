import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hqRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(hqRoot, "..");
const distRoot = join(hqRoot, "dist");
const registryRoot = join(repoRoot, "data", "registry");

const expectedRoutes = [
  "index.html",
  "performance/index.html",
  "growth/index.html",
  "delivery/index.html",
  "company/index.html",
  "company/technical-landscape/index.html",
  "library/index.html"
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : entry.name.endsWith(".html") ? [path] : [];
  });
}

function routeFile(pathname) {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  return clean ? join(distRoot, clean, "index.html") : join(distRoot, "index.html");
}

assert.ok(existsSync(distRoot), "dist/ is missing. Run npm run build first.");
assert.ok(
  existsSync(join(distRoot, "brand", "bpp-b-mark.png")),
  "The built shell is missing the local canonical BPP mark."
);
assert.ok(existsSync(join(distRoot, "_headers")), "The Cloudflare security headers file is missing.");
assert.ok(existsSync(join(distRoot, "robots.txt")), "The robots exclusion file is missing.");
assert.ok(
  readFileSync(join(distRoot, "robots.txt"), "utf8").includes("Disallow: /"),
  "robots.txt must exclude the entire protected preview."
);
for (const route of expectedRoutes) {
  assert.ok(existsSync(join(distRoot, route)), `Missing expected route output: ${route}`);
}

const pages = readJson(join(registryRoot, "pages.json"));
const offers = readJson(join(registryRoot, "offers.json"));
const targets = readJson(join(registryRoot, "targets.json"));
const repositories = readJson(join(registryRoot, "repositories.json"));

assert.equal(pages.schema_version, 1, "Unsupported page registry schema.");
assert.ok(Array.isArray(pages.pages) && pages.pages.length > 0, "Page registry is empty.");
for (const record of pages.pages) {
  for (const field of [
    "id",
    "title",
    "route",
    "section",
    "page_type",
    "owner",
    "status",
    "confidentiality",
    "source_of_truth",
    "last_verified"
  ]) {
    assert.ok(record[field], `Page registry record ${record.id ?? "(unknown)"} is missing ${field}.`);
  }
  assert.equal(typeof record.external_publish, "boolean", `${record.id} external_publish must be boolean.`);
}

const businessPlan = pages.pages.find((record) => record.id === "business-plan");
const strategicPlan = pages.pages.find((record) => record.id === "strategic-plan-v9");
assert.equal(businessPlan?.status, "canonical", "Business Plan must be canonical.");
assert.equal(strategicPlan?.status, "historical", "Strategic Plan v9 must be historical.");
assert.equal(strategicPlan?.replaced_by, "business-plan", "Historical plan must point to the Business Plan.");

const aiJumpstart = offers.offers.find((offer) => offer.id === "ai-jumpstart");
assert.equal(aiJumpstart?.standard_price, 699, "AI Jumpstart standard price is incorrect.");
assert.equal(aiJumpstart?.current_price, 599, "AI Jumpstart launch price is incorrect.");
assert.equal(aiJumpstart?.launch_discount, 100, "AI Jumpstart launch discount is incorrect.");
assert.equal(aiJumpstart?.stackable_discount, false, "AI Jumpstart launch discount cannot stack.");

const operatorSystem = offers.offers.find((offer) => offer.id === "operator-system");
assert.equal(operatorSystem?.status, "approved", "Operator System must remain approved.");
assert.equal(operatorSystem?.standard_price, 5500, "Operator System standard price is incorrect.");
assert.equal(operatorSystem?.current_price, 5500, "Operator System current price is incorrect.");
assert.equal(operatorSystem?.effective_date, "2026-07-22", "Operator System effective date is incorrect.");

assert.ok(
  targets.targets.some(
    (target) =>
      target.metric_id === "revenue" &&
      target.period === "2026" &&
      target.scenario === "base" &&
      target.status === "canonical"
  ),
  "Canonical 2026 base revenue target is missing."
);

assert.equal(repositories.schema_version, 1, "Unsupported repository registry schema.");
assert.equal(repositories.repositories?.length, 12, "The repository inventory must contain 12 reviewed records.");
const repositoryIds = new Set(repositories.repositories.map((record) => record.id));
for (const id of ["bpp-workspace", "bpp-tools", "bpp-plugins", "bpp-free-tools", "organization-github"]) {
  assert.ok(repositoryIds.has(id), `Core repository ${id} is missing from the technical landscape.`);
}
assert.equal(
  repositories.repositories.find((record) => record.id === "bpp-free-tools")?.importance,
  "essential",
  "BPP Free Tools must remain classified as an essential repository."
);
assert.equal(
  repositories.repositories.find((record) => record.id === "bpp-webflow-site")?.status,
  "deprioritized",
  "The Webflow repository must reflect the current hold state."
);
assert.equal(
  repositories.repositories.find((record) => record.id === "ruflo")?.origin,
  "upstream-fork",
  "Ruflo must remain clearly identified as an upstream fork."
);

const prohibitedHref = /^(?:#|javascript:|about:blank)$/i;
const placeholderHost = /(?:example\.com|placeholder\.test)/i;
const htmlPaths = htmlFiles(distRoot);
const renderedFreshnessStates = [];
const globalStyles = readFileSync(join(hqRoot, "src", "styles", "global.css"), "utf8");
const freshnessSource = readFileSync(join(hqRoot, "src", "data", "freshness.ts"), "utf8");
assert.ok(globalStyles.includes("--canvas: #fcfcfc;"), "The canonical clean canvas token is missing.");
assert.ok(!globalStyles.includes("background-size: 64px 64px"), "The old graph-paper texture returned.");
assert.ok(!freshnessSource.includes("proofSnapshot"), "Freshness must not use a frozen proof snapshot.");
assert.ok(freshnessSource.includes("new Date()"), "Freshness must default to the current build date.");

for (const htmlPath of htmlPaths) {
  const html = readFileSync(htmlPath, "utf8");
  const route = relative(distRoot, htmlPath).replaceAll("\\", "/");
  const h1Count = (html.match(/<h1(?:\s|>)/g) ?? []).length;
  assert.equal(h1Count, 1, `${route} must contain exactly one h1.`);
  assert.ok(!html.includes("—"), `${route} contains an em dash.`);
  assert.ok(!/\bleverage\b/i.test(html), `${route} uses prohibited brand wording.`);
  assert.ok(
    html.includes('src="/brand/bpp-b-mark.png"'),
    `${route} does not render the local canonical BPP mark.`
  );
  assert.ok(
    html.includes('<meta name="robots" content="noindex, nofollow, noarchive">'),
    `${route} is missing the protected-preview robots directive.`
  );

  const pageSource = html.match(/data-page-source="([^"]+)"/)?.[1];
  const freshnessState = html.match(/data-freshness-state="([^"]+)"/)?.[1];
  const pageVerified = html.match(/data-page-verified="([^"]+)"/)?.[1];
  assert.ok(pageSource, `${route} utility bar is missing its page source.`);
  assert.ok(pageVerified, `${route} utility bar is missing its verification date.`);
  assert.ok(
    ["current", "stale", "historical", "unavailable"].includes(freshnessState),
    `${route} utility bar has an invalid freshness state.`
  );
  assert.ok(
    /class="utility-source-value"[^>]*>[^<]+</.test(html),
    `${route} utility bar source is not visibly rendered.`
  );
  assert.ok(
    /class="utility-freshness-label">[^<]+</.test(html),
    `${route} utility bar freshness detail is not visibly rendered.`
  );
  renderedFreshnessStates.push(freshnessState);

  for (const metric of html.matchAll(/<article class="metric[^"]*"[^>]*>([\s\S]*?)<\/article>/g)) {
    assert.ok(metric[1].includes("<dt>Timeframe</dt>"), `${route} has a metric without a timeframe.`);
    assert.ok(metric[1].includes("<dt>Source</dt>"), `${route} has a metric without a source.`);
  }

  for (const match of html.matchAll(/href="([^"]*)"/g)) {
    const href = match[1];
    assert.ok(href.length > 0, `${route} contains an empty href.`);
    assert.ok(!prohibitedHref.test(href), `${route} contains prohibited placeholder link ${href}.`);
    assert.ok(!placeholderHost.test(href), `${route} contains placeholder host ${href}.`);
    if (!href.startsWith("/") && !href.startsWith("#")) continue;
    if (href.startsWith("/_astro/") || /\.[a-z0-9]+(?:[?#]|$)/i.test(href)) continue;

    const [hrefWithoutQuery] = href.split("?");
    const [pathnamePart, fragment] = hrefWithoutQuery.split("#");
    const target = pathnamePart
      ? routeFile(pathnamePart)
      : htmlPath;
    assert.ok(existsSync(target), `${route} links to missing route ${href}.`);

    if (fragment) {
      const targetHtml = readFileSync(target, "utf8");
      assert.ok(
        new RegExp(`id=["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(targetHtml),
        `${route} links to missing anchor ${href}.`
      );
    }
  }
}

assert.ok(
  renderedFreshnessStates.includes("stale"),
  "The built routes do not demonstrate a derived stale utility state."
);

const performanceHtml = readFileSync(join(distRoot, "performance", "index.html"), "utf8");
const growthHtml = readFileSync(join(distRoot, "growth", "index.html"), "utf8");
const companyHtml = readFileSync(join(distRoot, "company", "index.html"), "utf8");
const landscapeHtml = readFileSync(join(distRoot, "company", "technical-landscape", "index.html"), "utf8");
const performanceRecord = pages.pages.find((record) => record.id === "performance-dashboard");
const growthRecord = pages.pages.find((record) => record.id === "seller-start");
assert.ok(
  performanceHtml.includes(`data-page-source="${performanceRecord.source_of_truth}"`) &&
    performanceHtml.includes(`data-page-verified="${performanceRecord.last_verified}"`),
  "Performance utility metadata must use the page registry record."
);
assert.ok(
  growthHtml.includes(`data-page-source="${growthRecord.source_of_truth}"`) &&
    growthHtml.includes(`data-page-verified="${growthRecord.last_verified}"`),
  "Growth utility metadata must use the page registry record."
);
assert.ok(
  companyHtml.includes(`data-page-source="${businessPlan.source_of_truth}"`) &&
    companyHtml.includes(`data-page-verified="${businessPlan.last_verified}"`),
  "Company utility metadata must use the Business Plan registry record."
);
for (const repository of repositories.repositories) {
  assert.ok(
    landscapeHtml.includes(repository.name),
    `Technical Landscape does not render repository ${repository.name}.`
  );
}
assert.ok(
  landscapeHtml.includes("Twelve repositories does not mean twelve core systems"),
  "Technical Landscape must explain that the inventory is not twelve equal core systems."
);

const hrStart = companyHtml.indexOf("HR &amp; People Ops");
const hrEnd = companyHtml.indexOf("</li>", hrStart);
const hrBlock = companyHtml.slice(hrStart, hrEnd);
assert.ok(hrStart >= 0 && hrEnd > hrStart, "Company must render the HR & People Ops cockpit.");
assert.ok(hrBlock.includes("status-parked"), "HR & People Ops must render Parked status.");
assert.ok(hrBlock.includes("Daunte researching"), "HR & People Ops must show Daunte researching.");
assert.ok(hrBlock.includes("Not assigned"), "HR & People Ops must not claim a ratified DRI.");
assert.ok(!hrBlock.includes("All owners"), "HR & People Ops must not assign All owners as DRI.");

console.log(
  `Validation passed: ${expectedRoutes.length} routes, ${pages.pages.length} registry records, ` +
  `${htmlPaths.length} HTML files, utility source/freshness metadata, HR ownership truth, ` +
  "preview security metadata, no placeholder links, and all internal routes resolved."
);
