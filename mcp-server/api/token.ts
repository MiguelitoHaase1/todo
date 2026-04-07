/**
 * OAuth /token — code exchange + refresh token grant.
 *
 * Two grant types supported:
 *   - authorization_code: exchanges a code from /authorize for a JWT access
 *     token (1h TTL) and an opaque refresh token (30d TTL). Verifies PKCE,
 *     consumes the code, persists the refresh token row.
 *   - refresh_token: validates the refresh token isn't expired/revoked,
 *     issues a new access token, rotates the refresh token (revokes old,
 *     creates new).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "node:crypto";
import {
  getCode,
  consumeCode,
  createRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} from "../src/auth/store.js";
import { verifyPkce } from "../src/auth/pkce.js";
import { signAccessToken } from "../src/auth/jwt.js";
import { getMcpResourceUrl, getDefaultSubject, getDefaultScope } from "../src/config.js";

const REFRESH_TTL_DAYS = 30;

function parseBody(req: VercelRequest): Record<string, string> {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  if (typeof req.body === "string") {
    const out: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(req.body).entries()) out[k] = v;
    return out;
  }
  return {};
}

function err(res: VercelResponse, status: number, error: string, description: string): void {
  res.status(status).json({ error, error_description: description });
}

async function handleAuthorizationCodeGrant(body: Record<string, string>, res: VercelResponse): Promise<void> {
  const { code, redirect_uri, client_id, code_verifier } = body;
  if (!code) return err(res, 400, "invalid_request", "missing code");
  if (!redirect_uri) return err(res, 400, "invalid_request", "missing redirect_uri");
  if (!client_id) return err(res, 400, "invalid_request", "missing client_id");
  if (!code_verifier) return err(res, 400, "invalid_request", "missing code_verifier (PKCE required)");

  const stored = await getCode(code);
  if (!stored) return err(res, 400, "invalid_grant", "code not found");
  if (stored.consumed_at) return err(res, 400, "invalid_grant", "code already used");
  if (new Date(stored.expires_at).getTime() < Date.now()) return err(res, 400, "invalid_grant", "code expired");
  if (stored.client_id !== client_id) return err(res, 400, "invalid_grant", "client_id mismatch");
  if (stored.redirect_uri !== redirect_uri) return err(res, 400, "invalid_grant", "redirect_uri mismatch");

  if (!verifyPkce(code_verifier, stored.code_challenge, stored.code_challenge_method)) {
    return err(res, 400, "invalid_grant", "PKCE verification failed");
  }

  await consumeCode(code);

  const audience = stored.resource ?? getMcpResourceUrl();
  const { token: accessToken, expiresIn } = await signAccessToken({
    subject: stored.subject,
    scope: stored.scope ?? getDefaultScope(),
    clientId: stored.client_id,
    resource: stored.resource ?? undefined,
    audience,
  });

  const refreshTokenId = randomBytes(32).toString("base64url");
  const refreshExpires = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await createRefreshToken({
    token_id: refreshTokenId,
    client_id: stored.client_id,
    subject: stored.subject,
    scope: stored.scope ?? null,
    resource: stored.resource ?? null,
    expires_at: refreshExpires,
  });

  res.status(200).json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    refresh_token: refreshTokenId,
    scope: stored.scope ?? getDefaultScope(),
  });
}

async function handleRefreshTokenGrant(body: Record<string, string>, res: VercelResponse): Promise<void> {
  const { refresh_token, client_id } = body;
  if (!refresh_token) return err(res, 400, "invalid_request", "missing refresh_token");
  if (!client_id) return err(res, 400, "invalid_request", "missing client_id");

  const stored = await getRefreshToken(refresh_token);
  if (!stored) return err(res, 400, "invalid_grant", "refresh_token not found");
  if (stored.revoked_at) return err(res, 400, "invalid_grant", "refresh_token revoked");
  if (new Date(stored.expires_at).getTime() < Date.now()) return err(res, 400, "invalid_grant", "refresh_token expired");
  if (stored.client_id !== client_id) return err(res, 400, "invalid_grant", "client_id mismatch");

  // Rotate
  await revokeRefreshToken(refresh_token);

  const audience = stored.resource ?? getMcpResourceUrl();
  const { token: accessToken, expiresIn } = await signAccessToken({
    subject: stored.subject,
    scope: stored.scope ?? getDefaultScope(),
    clientId: stored.client_id,
    resource: stored.resource ?? undefined,
    audience,
  });

  const newRefreshId = randomBytes(32).toString("base64url");
  const refreshExpires = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await createRefreshToken({
    token_id: newRefreshId,
    client_id: stored.client_id,
    subject: stored.subject,
    scope: stored.scope,
    resource: stored.resource,
    expires_at: refreshExpires,
  });

  res.status(200).json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    refresh_token: newRefreshId,
    scope: stored.scope ?? getDefaultScope(),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = parseBody(req);
  const grantType = body.grant_type;

  try {
    if (grantType === "authorization_code") {
      await handleAuthorizationCodeGrant(body, res);
    } else if (grantType === "refresh_token") {
      await handleRefreshTokenGrant(body, res);
    } else {
      err(res, 400, "unsupported_grant_type", `grant_type "${grantType}" not supported`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[token] failed:", msg);
    res.status(500).json({ error: "server_error", error_description: msg });
  }
}
