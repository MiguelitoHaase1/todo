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
import { getMcpResourceUrl, getDefaultScope } from "../src/config.js";
import { parseFormBody } from "../src/util/form-body.js";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface GrantContext {
  client_id: string;
  subject: string;
  scope: string | null;
  resource: string | null;
}

function err(res: VercelResponse, status: number, error: string, description: string): void {
  res.status(status).json({ error, error_description: description });
}

/** Issue a new opaque refresh token row, return its ID. */
async function issueRefreshToken(ctx: GrantContext): Promise<string> {
  const tokenId = randomBytes(32).toString("base64url");
  await createRefreshToken({
    token_id: tokenId,
    client_id: ctx.client_id,
    subject: ctx.subject,
    scope: ctx.scope,
    resource: ctx.resource,
    expires_at: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
  });
  return tokenId;
}

/** Build the standard {access_token, refresh_token, ...} response body. */
async function issueTokenBundle(ctx: GrantContext): Promise<{
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}> {
  const audience = ctx.resource ?? getMcpResourceUrl();
  const { token, expiresIn } = await signAccessToken({
    subject: ctx.subject,
    scope: ctx.scope ?? getDefaultScope(),
    clientId: ctx.client_id,
    resource: ctx.resource ?? undefined,
    audience,
  });
  const refreshTokenId = await issueRefreshToken(ctx);
  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
    refresh_token: refreshTokenId,
    scope: ctx.scope ?? getDefaultScope(),
  };
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

  const bundle = await issueTokenBundle({
    client_id: stored.client_id,
    subject: stored.subject,
    scope: stored.scope,
    resource: stored.resource,
  });
  res.status(200).json(bundle);
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

  // Rotate: revoke old + issue new in parallel (different rows, no need to serialize).
  const [, bundle] = await Promise.all([
    revokeRefreshToken(refresh_token),
    issueTokenBundle({
      client_id: stored.client_id,
      subject: stored.subject,
      scope: stored.scope,
      resource: stored.resource,
    }),
  ]);
  res.status(200).json(bundle);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = parseFormBody(req);
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
