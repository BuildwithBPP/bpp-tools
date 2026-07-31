const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesFromBase64(value) {
  const binary = atob(String(value));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64FromBytes(value) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function encryptionKey(encodedKey, usage) {
  const bytes = bytesFromBase64(encodedKey);
  if (bytes.byteLength !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32-bytes.");
  }
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [usage]);
}

export async function encryptCredential(plaintext, encodedKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(encodedKey, "encrypt");
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(String(plaintext))
  );
  return {
    version: 1,
    ciphertext: base64FromBytes(new Uint8Array(ciphertext)),
    iv: base64FromBytes(iv)
  };
}

export async function decryptCredential(encrypted, encodedKey) {
  if (encrypted?.version !== 1 || !encrypted.ciphertext || !encrypted.iv) {
    throw new Error("Stored connector credential has an unsupported format.");
  }
  const key = await encryptionKey(encodedKey, "decrypt");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytesFromBase64(encrypted.iv) },
    key,
    bytesFromBase64(encrypted.ciphertext)
  );
  return decoder.decode(plaintext);
}
