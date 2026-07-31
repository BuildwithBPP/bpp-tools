import { pathToFileURL } from "node:url";

const infrastructureSecrets = ["ACCESS_AUD", "CREDENTIAL_ENCRYPTION_KEY"];

export function planInfrastructureSecretUploads({ existingSecrets, initializeInfrastructure }) {
  const existing = new Set(existingSecrets);
  const missingInfrastructureSecrets = infrastructureSecrets.filter((name) => !existing.has(name));
  return {
    generateCredentialEncryptionKey:
      Boolean(initializeInfrastructure) && missingInfrastructureSecrets.includes("CREDENTIAL_ENCRYPTION_KEY"),
    promptAccessAudience: Boolean(initializeInfrastructure) && missingInfrastructureSecrets.includes("ACCESS_AUD"),
    missingInfrastructureSecrets
  };
}

function main() {
  const existingIndex = process.argv.indexOf("--existing");
  const existingSecrets =
    existingIndex >= 0
      ? String(process.argv[existingIndex + 1] ?? "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [];
  const plan = planInfrastructureSecretUploads({
    existingSecrets,
    initializeInfrastructure: process.argv.includes("--initialize")
  });
  console.log(JSON.stringify(plan));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
