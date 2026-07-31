import { createRemoteJWKSet, jwtVerify } from "jose";
import { authorizeManualRefresh } from "./core.mjs";

const keysets = new Map();

function issuerFor(teamDomain) {
  return `https://${teamDomain}.cloudflareaccess.com`;
}

export async function verifyOwner(request, env) {
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion) throw new Error("Cloudflare Access assertion is missing.");
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new Error("Access verification is not configured.");

  const issuer = issuerFor(env.ACCESS_TEAM_DOMAIN);
  if (!keysets.has(issuer)) {
    keysets.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
  }
  const { payload } = await jwtVerify(assertion, keysets.get(issuer), {
    issuer,
    audience: env.ACCESS_AUD
  });
  const allowed = String(env.OWNER_EMAILS ?? "").split(",").map((email) => email.trim()).filter(Boolean);
  return authorizeManualRefresh(payload.email, allowed);
}
