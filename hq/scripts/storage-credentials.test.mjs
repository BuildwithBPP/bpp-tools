import assert from "node:assert/strict";
import test from "node:test";

import { D1R2Store } from "../refresh-worker/storage.mjs";

function credentialDb() {
  const state = { row: null, writes: [] };
  return {
    state,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              state.writes.push({ sql, values });
              state.row = {
                version: values[2],
                ciphertext: values[3],
                iv: values[4]
              };
            },
            async first() {
              return state.row;
            }
          };
        }
      };
    }
  };
}

test("D1 credential storage encrypts rotating tokens at rest", async () => {
  const db = credentialDb();
  const store = new D1R2Store({
    HQ_DB: db,
    HQ_RAW: {},
    CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64")
  });

  await store.writeCredential("quickbooks", "refresh_token", "rotated-refresh-token");

  assert.equal(db.state.writes.length, 1);
  assert.ok(!JSON.stringify(db.state.writes).includes("rotated-refresh-token"));
  assert.equal(await store.readCredential("quickbooks", "refresh_token"), "rotated-refresh-token");
});

test("D1 credential storage refuses to operate without its encryption secret", async () => {
  const store = new D1R2Store({ HQ_DB: credentialDb(), HQ_RAW: {} });
  await assert.rejects(
    store.writeCredential("quickbooks", "refresh_token", "secret"),
    /CREDENTIAL_ENCRYPTION_KEY/
  );
});
