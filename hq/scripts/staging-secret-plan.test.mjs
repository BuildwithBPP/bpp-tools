import assert from "node:assert/strict";
import test from "node:test";

let planInfrastructureSecretUploads;
try {
  ({ planInfrastructureSecretUploads } = await import("./staging-secret-plan.mjs"));
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

test("connector setup preserves existing infrastructure secrets", () => {
  assert.equal(typeof planInfrastructureSecretUploads, "function");
  assert.deepEqual(
    planInfrastructureSecretUploads({
      existingSecrets: ["ACCESS_AUD", "CREDENTIAL_ENCRYPTION_KEY"],
      initializeInfrastructure: false
    }),
    {
      generateCredentialEncryptionKey: false,
      promptAccessAudience: false,
      missingInfrastructureSecrets: []
    }
  );
});

test("initialization creates only missing infrastructure secrets", () => {
  assert.deepEqual(
    planInfrastructureSecretUploads({
      existingSecrets: ["ACCESS_AUD"],
      initializeInfrastructure: true
    }),
    {
      generateCredentialEncryptionKey: true,
      promptAccessAudience: false,
      missingInfrastructureSecrets: ["CREDENTIAL_ENCRYPTION_KEY"]
    }
  );
});

test("ordinary connector setup reports missing infrastructure without rotating anything", () => {
  assert.deepEqual(
    planInfrastructureSecretUploads({
      existingSecrets: [],
      initializeInfrastructure: false
    }),
    {
      generateCredentialEncryptionKey: false,
      promptAccessAudience: false,
      missingInfrastructureSecrets: ["ACCESS_AUD", "CREDENTIAL_ENCRYPTION_KEY"]
    }
  );
});
