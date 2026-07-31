import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function quotedValue(config, key) {
  const match = config.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  if (!match) throw new Error(`Production configuration is missing ${key}.`);
  return match[1];
}

export function validateProductionConfiguration({ pagesConfig, workerConfig }) {
  const pagesProject = quotedValue(pagesConfig, "name");
  const environment = quotedValue(pagesConfig, "PUBLIC_HQ_ENVIRONMENT");
  const refreshService = quotedValue(pagesConfig, "service");
  const workerName = quotedValue(workerConfig, "name");
  const allowedOrigins = quotedValue(workerConfig, "ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const databaseName = quotedValue(workerConfig, "database_name");
  const bucketName = quotedValue(workerConfig, "bucket_name");

  if ([pagesProject, refreshService, workerName, databaseName, bucketName].some((value) => value.includes("staging"))) {
    throw new Error("Production configuration cannot reuse staging resources.");
  }
  if (pagesProject !== "bpp-hq" || environment !== "production") {
    throw new Error("Production Pages must use project bpp-hq with PUBLIC_HQ_ENVIRONMENT=production.");
  }
  if (workerName !== "bpp-hq-refresh" || refreshService !== workerName) {
    throw new Error("Production Pages must bind to the separate bpp-hq-refresh Worker.");
  }
  if (!allowedOrigins.includes("https://bpp-hq.pages.dev")) {
    throw new Error("Production must allow the protected https://bpp-hq.pages.dev launch origin.");
  }
  if (databaseName !== "bpp-hq-data" || bucketName !== "bpp-hq-snapshots") {
    throw new Error("Production must use its separate D1 and R2 resources.");
  }

  return {
    pagesProject,
    workerName,
    refreshService,
    primaryOrigin: "https://bpp-hq.pages.dev",
    databaseName,
    bucketName
  };
}

function main() {
  const hqRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = validateProductionConfiguration({
    pagesConfig: readFileSync(join(hqRoot, "wrangler.production.example.toml"), "utf8"),
    workerConfig: readFileSync(join(hqRoot, "refresh-worker", "wrangler.example.toml"), "utf8")
  });
  console.log(
    `Production configuration verified: ${result.pagesProject} -> ${result.refreshService}, ` +
      `${result.databaseName}, ${result.bucketName}, ${result.primaryOrigin}.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
