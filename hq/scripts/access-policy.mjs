import assert from "node:assert/strict";

function policyEmail(rule) {
  return rule?.email?.email?.trim().toLowerCase() ?? null;
}

export function resolveProtectedDomain(value, fallback) {
  const domain = String(value ?? "").trim().toLowerCase() || fallback;
  assert.match(
    domain,
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "The protected domain must be a hostname without a scheme, path, query, or port."
  );
  return domain;
}

export function validateAccessConfiguration({
  applications,
  identityProviders,
  policies,
  protectedDomain,
  expectedEmails
}) {
  const normalizedExpectedEmails = [...new Set(expectedEmails.map((email) => email.trim().toLowerCase()))];
  assert.equal(
    normalizedExpectedEmails.length,
    3,
    "The protected preview must have exactly three approved owner emails."
  );

  const application = applications.find((app) => app.domain === protectedDomain);
  assert.ok(application, `No Access application protects ${protectedDomain}.`);
  assert.equal(application.type, "self_hosted", "The preview must use a self-hosted Access application.");
  assert.equal(
    application.auto_redirect_to_identity,
    true,
    "The Access application must redirect directly to the approved Microsoft identity provider."
  );

  const microsoftIds = new Set(
    identityProviders.filter((provider) => provider.type === "azureAD").map((provider) => provider.id)
  );
  assert.ok(microsoftIds.size > 0, "No Microsoft Entra ID identity provider is configured.");
  assert.ok(
    application.allowed_idps?.length > 0 &&
      application.allowed_idps.every((providerId) => microsoftIds.has(providerId)),
    "The preview must allow only Microsoft Entra ID identity providers."
  );

  const allowPolicies = policies.filter((policy) => policy.decision === "allow");
  assert.ok(allowPolicies.length > 0, "The Access application has no Allow policy.");

  const broadSelectors = [
    "everyone",
    "email_domain",
    "group",
    "azureAD",
    "github_organization",
    "ip",
    "ip_list",
    "any_valid_service_token"
  ];
  const includeRules = allowPolicies.flatMap((policy) => policy.include ?? []);
  assert.ok(
    includeRules.every((rule) => !broadSelectors.some((selector) => selector in rule)),
    "The Allow policy contains a selector broader than the three approved owner emails."
  );

  const allowedEmails = [...new Set(includeRules.map(policyEmail).filter(Boolean))].sort();
  assert.deepEqual(
    allowedEmails,
    [...normalizedExpectedEmails].sort(),
    "The Access Allow policy does not match the three approved owner emails exactly."
  );

  return {
    applicationId: application.id,
    protectedDomain,
    approvedEmailCount: allowedEmails.length
  };
}
