import assert from "node:assert/strict";
import { validateAccessConfiguration } from "./access-policy.mjs";

const projectName = "bpp-hq-preview";
const protectedDomain = `${projectName}.pages.dev`;
const apiBase = "https://api.cloudflare.com/client/v4";

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const expectedEmails = [
  ...new Set(
    String(process.env.BPP_HQ_APPROVED_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )
];

assert.ok(token, "CLOUDFLARE_API_TOKEN is required.");
assert.ok(accountId, "CLOUDFLARE_ACCOUNT_ID is required.");
assert.equal(
  expectedEmails.length,
  3,
  "BPP_HQ_APPROVED_EMAILS must contain exactly the three approved owner email addresses."
);

async function cloudflare(path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    const detail = payload.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`Cloudflare verification failed (${response.status}): ${detail}`);
  }
  return payload.result;
}

const applications = await cloudflare(
  `/accounts/${accountId}/access/apps?domain=${encodeURIComponent(protectedDomain)}&exact=true`
);
const application = applications.find((app) => app.domain === protectedDomain);
assert.ok(application, `No Access application protects ${protectedDomain}.`);

const identityProviders = await cloudflare(`/accounts/${accountId}/access/identity_providers`);
const policies = await cloudflare(`/accounts/${accountId}/access/apps/${application.id}/policies`);
validateAccessConfiguration({
  applications,
  identityProviders,
  policies,
  protectedDomain,
  expectedEmails
});

console.log(
  `Access verification passed for ${protectedDomain}: Microsoft Entra ID only, ` +
    "three exact owner emails, implicit default deny."
);
