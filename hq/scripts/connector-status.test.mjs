import assert from "node:assert/strict";
import test from "node:test";

import { buildSourceStatus } from "../refresh-worker/index.mjs";
import { sourceRecord } from "../refresh-worker/adapters.mjs";

test("connector status names the missing setup without exposing supplied values", async () => {
  const status = await buildSourceStatus(
    sourceRecord("hubspot"),
    { UNUSED_SECRET: "do-not-return" },
    null
  );

  assert.equal(status.configured, false);
  assert.match(status.configuration_reason, /HUBSPOT_ACCESS_TOKEN/);
  assert.ok(!JSON.stringify(status).includes("do-not-return"));
});

test("connector status clears setup guidance after configuration", async () => {
  const latest = { source: "hubspot", last_success_at: "2026-07-31T12:00:00Z" };
  const status = await buildSourceStatus(
    sourceRecord("hubspot"),
    { HUBSPOT_ACCESS_TOKEN: "configured-token" },
    latest
  );

  assert.equal(status.configured, true);
  assert.equal(status.configuration_reason, null);
  assert.equal(status.latest, latest);
  assert.ok(!JSON.stringify(status).includes("configured-token"));
});

test("QuickBooks is not ready until a bootstrap or encrypted refresh token exists", async () => {
  const status = await buildSourceStatus(
    sourceRecord("quickbooks"),
    {
      QUICKBOOKS_CLIENT_ID: "client-id",
      QUICKBOOKS_CLIENT_SECRET: "client-secret",
      QUICKBOOKS_REALM_ID: "realm-id"
    },
    null,
    { async readCredential() { return null; } }
  );

  assert.equal(status.configured, false);
  assert.match(status.configuration_reason, /QUICKBOOKS_REFRESH_TOKEN/);
});

test("QuickBooks recognizes an encrypted stored refresh token without returning it", async () => {
  const status = await buildSourceStatus(
    sourceRecord("quickbooks"),
    {
      QUICKBOOKS_CLIENT_ID: "client-id",
      QUICKBOOKS_CLIENT_SECRET: "client-secret",
      QUICKBOOKS_REALM_ID: "realm-id"
    },
    null,
    { async readCredential() { return "stored-refresh-token"; } }
  );

  assert.equal(status.configured, true);
  assert.equal(status.configuration_reason, null);
  assert.ok(!JSON.stringify(status).includes("stored-refresh-token"));
});
