import assert from "node:assert/strict";
import test from "node:test";

import { decryptCredential, encryptCredential } from "../refresh-worker/credential-crypto.mjs";

const key = Buffer.alloc(32, 7).toString("base64");

test("encrypts a connector credential with authenticated encryption and round-trips it", async () => {
  const encrypted = await encryptCredential("rotating-refresh-token", key);

  assert.equal(encrypted.version, 1);
  assert.ok(encrypted.ciphertext);
  assert.ok(encrypted.iv);
  assert.ok(!JSON.stringify(encrypted).includes("rotating-refresh-token"));
  assert.equal(await decryptCredential(encrypted, key), "rotating-refresh-token");
});

test("rejects a malformed encryption key instead of weakening encryption", async () => {
  await assert.rejects(
    encryptCredential("secret", Buffer.from("too-short").toString("base64")),
    /32-byte/
  );
});

test("rejects tampered ciphertext", async () => {
  const encrypted = await encryptCredential("rotating-refresh-token", key);
  const bytes = Buffer.from(encrypted.ciphertext, "base64");
  bytes[0] ^= 1;

  await assert.rejects(
    decryptCredential({ ...encrypted, ciphertext: bytes.toString("base64") }, key)
  );
});
