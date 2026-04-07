/**
 * JWT signing and verification for access tokens.
 * HS256 with a shared secret from JWT_SIGNING_KEY env var.
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ISSUER = "todolist-mcp-server";
const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function getSecret(): Uint8Array {
  const key = process.env.JWT_SIGNING_KEY;
  if (!key) {
    throw new Error("JWT_SIGNING_KEY env var is not set");
  }
  return new TextEncoder().encode(key);
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
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setSubject(claims.subject)
    .setAudience(claims.audience)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);

  return { token: jwt, expiresIn: TOKEN_TTL_SECONDS };
}

export async function verifyAccessToken(token: string, expectedAudience: string): Promise<AccessTokenClaims> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: expectedAudience,
  });
  if (typeof payload.sub !== "string" || typeof payload.scope !== "string" || typeof payload.client_id !== "string") {
    throw new Error("invalid token claims");
  }
  return payload as AccessTokenClaims;
}
