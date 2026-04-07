/**
 * JWT signing and verification for access tokens.
 * HS256 with a shared secret from JWT_SIGNING_KEY env var.
 *
 * The `iss` claim must match the AS metadata `issuer` value (RFC 8414 / 9068),
 * so we use the public URL from config — not a hand-rolled string. Strict
 * clients like claude.ai's connector reject tokens with a mismatched issuer.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getPublicUrl } from "../config.js";

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

// Secret is fetched once per cold start and cached for the life of the worker.
// Reading process.env + TextEncoder.encode on every request is wasted CPU on
// the auth-validation hot path; this lets the JIT specialize the closure too.
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const key = process.env.JWT_SIGNING_KEY;
  if (!key) {
    throw new Error("JWT_SIGNING_KEY env var is not set");
  }
  cachedSecret = new TextEncoder().encode(key);
  return cachedSecret;
}

export interface AccessTokenClaims extends JWTPayload {
  sub: string;
  scope: string;
  client_id: string;
  resource?: string;
}

export async function signAccessToken(claims: {
  subject: string;
  scope: string;
  clientId: string;
  resource?: string;
  audience: string;
}): Promise<{ token: string; expiresIn: number }> {
  const secret = getSecret();

  const jwt = await new SignJWT({
    scope: claims.scope,
    client_id: claims.clientId,
    ...(claims.resource ? { resource: claims.resource } : {}),
  })
    // typ "at+jwt" is the RFC 9068 access-token profile; some validators
    // (including claude.ai) require it instead of plain "JWT".
    .setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
    .setIssuer(getPublicUrl())
    .setSubject(claims.subject)
    .setAudience(claims.audience)
    .setIssuedAt()
    .setNotBefore(0)
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);

  return { token: jwt, expiresIn: TOKEN_TTL_SECONDS };
}

export async function verifyAccessToken(token: string, expectedAudience: string): Promise<AccessTokenClaims> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, {
    issuer: getPublicUrl(),
    audience: expectedAudience,
    typ: "at+jwt",
  });
  if (typeof payload.sub !== "string" || typeof payload.scope !== "string" || typeof payload.client_id !== "string") {
    throw new Error("invalid token claims");
  }
  return payload as AccessTokenClaims;
}
