import { pathToFileURL } from "node:url";

function requiredBase(value, name) {
  if (!value) throw new Error(`${name} is required.`);
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS.`);
  return url.toString().replace(/\/$/, "");
}

export async function verifyStagingBoundary({ stableBase, deploymentBase, workerBase, fetchImpl = fetch }) {
  const stable = requiredBase(stableBase, "HQ_STABLE_URL");
  const deployment = requiredBase(deploymentBase, "HQ_DEPLOYMENT_URL");
  const worker = requiredBase(workerBase, "HQ_WORKER_URL");
  const checks = [
    { name: "stable site", url: `${stable}/`, expected: 302 },
    { name: "stable API", url: `${stable}/api/refresh/status`, expected: 302 },
    { name: "generated deployment", url: `${deployment}/`, expected: 302 },
    { name: "generated deployment API", url: `${deployment}/api/refresh/status`, expected: 302 },
    { name: "direct refresh Worker", url: `${worker}/api/refresh/status`, expected: 403 }
  ];
  const evidence = [];

  for (const check of checks) {
    const response = await fetchImpl(check.url, { redirect: "manual" });
    if (response.status !== check.expected) {
      throw new Error(`${check.name} returned ${response.status}; expected ${check.expected}.`);
    }
    evidence.push({ name: check.name, status: response.status, expected: check.expected });
  }

  return evidence;
}

async function main() {
  const evidence = await verifyStagingBoundary({
    stableBase: process.env.HQ_STABLE_URL ?? "https://bpp-hq-preview.pages.dev",
    deploymentBase: process.env.HQ_DEPLOYMENT_URL,
    workerBase: process.env.HQ_WORKER_URL ?? "https://bpp-hq-refresh-staging.buildwithbpp.workers.dev"
  });
  for (const check of evidence) {
    console.log(`${check.name}: HTTP ${check.status}`);
  }
  console.log("Protected staging boundary verified.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
