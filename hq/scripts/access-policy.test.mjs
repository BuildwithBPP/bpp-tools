import assert from "node:assert/strict";
import test from "node:test";
import { resolveProtectedDomain, validateAccessConfiguration } from "./access-policy.mjs";

const domain = "bpp-hq-preview.pages.dev";
const emails = ["owner1@bpp.test", "owner2@bpp.test", "owner3@bpp.test"];

function validFixture() {
  return {
    protectedDomain: domain,
    expectedEmails: emails,
    applications: [
      {
        id: "app-1",
        domain,
        type: "self_hosted",
        auto_redirect_to_identity: true,
        allowed_idps: ["azure-1"]
      }
    ],
    identityProviders: [{ id: "azure-1", type: "azureAD", name: "Microsoft Entra ID" }],
    policies: [
      {
        decision: "allow",
        include: emails.map((email) => ({ email: { email } }))
      }
    ]
  };
}

test("accepts Microsoft Entra ID with exactly three approved owner emails", () => {
  const result = validateAccessConfiguration(validFixture());
  assert.equal(result.approvedEmailCount, 3);
});

test("rejects broad email-domain access", () => {
  const fixture = validFixture();
  fixture.policies[0].include.push({ email_domain: { domain: "bpp.test" } });
  assert.throws(
    () => validateAccessConfiguration(fixture),
    /selector broader than the three approved owner emails/
  );
});

test("rejects a non-Microsoft identity provider", () => {
  const fixture = validFixture();
  fixture.identityProviders = [{ id: "otp-1", type: "onetimepin", name: "One-time PIN" }];
  fixture.applications[0].allowed_idps = ["otp-1"];
  assert.throws(() => validateAccessConfiguration(fixture), /No Microsoft Entra ID identity provider/);
});

test("rejects an extra allowed email", () => {
  const fixture = validFixture();
  fixture.policies[0].include.push({ email: { email: "extra@bpp.test" } });
  assert.throws(
    () => validateAccessConfiguration(fixture),
    /does not match the three approved owner emails exactly/
  );
});

test("rejects a missing Access application", () => {
  const fixture = validFixture();
  fixture.applications = [];
  assert.throws(() => validateAccessConfiguration(fixture), /No Access application protects/);
});

test("supports an explicit staging custom domain without accepting a URL or path", () => {
  assert.equal(resolveProtectedDomain("hq-staging.buildwithbpp.com", domain), "hq-staging.buildwithbpp.com");
  assert.equal(resolveProtectedDomain("", domain), domain);
  assert.throws(() => resolveProtectedDomain("https://hq-staging.buildwithbpp.com/api", domain), /hostname/);
});
