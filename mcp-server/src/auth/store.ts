/**
 * CRUD for the three OAuth tables in Supabase: oauth_clients, oauth_codes,
 * oauth_refresh_tokens. Thin wrapper over the synced Supabase REST helpers.
 */

import { sbSelect, sbInsert, sbUpdate, sbDelete } from "../_shared/supabase.js";

export interface OAuthClient {
  client_id: string;
  client_secret_hash: string | null;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  created_at: string;
}

export interface OAuthCode {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: "S256";
  scope: string | null;
  resource: string | null;
  subject: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface OAuthRefreshToken {
  token_id: string;
  client_id: string;
  subject: string;
  scope: string | null;
  resource: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

// ─── Clients ────────────────────────────────────────────────────────────────

export async function registerClient(
  client: Omit<OAuthClient, "created_at">,
): Promise<OAuthClient> {
  return sbInsert<OAuthClient>("oauth_clients", client as unknown as Record<string, unknown>);
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const rows = await sbSelect<OAuthClient>("oauth_clients", `client_id=eq.${encodeURIComponent(clientId)}`);
  return rows[0] ?? null;
}

// ─── Codes ──────────────────────────────────────────────────────────────────

export async function createCode(code: Omit<OAuthCode, "consumed_at" | "created_at">): Promise<OAuthCode> {
  return sbInsert<OAuthCode>("oauth_codes", code as unknown as Record<string, unknown>);
}

export async function getCode(code: string): Promise<OAuthCode | null> {
  const rows = await sbSelect<OAuthCode>("oauth_codes", `code=eq.${encodeURIComponent(code)}`);
  return rows[0] ?? null;
}

export async function consumeCode(code: string): Promise<void> {
  await sbUpdate<OAuthCode>(
    "oauth_codes",
    `code=eq.${encodeURIComponent(code)}`,
    { consumed_at: new Date().toISOString() },
  );
}

// ─── Refresh tokens ─────────────────────────────────────────────────────────

export async function createRefreshToken(
  token: Omit<OAuthRefreshToken, "revoked_at" | "created_at">,
): Promise<OAuthRefreshToken> {
  return sbInsert<OAuthRefreshToken>("oauth_refresh_tokens", token as unknown as Record<string, unknown>);
}

export async function getRefreshToken(tokenId: string): Promise<OAuthRefreshToken | null> {
  const rows = await sbSelect<OAuthRefreshToken>(
    "oauth_refresh_tokens",
    `token_id=eq.${encodeURIComponent(tokenId)}`,
  );
  return rows[0] ?? null;
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await sbUpdate<OAuthRefreshToken>(
    "oauth_refresh_tokens",
    `token_id=eq.${encodeURIComponent(tokenId)}`,
    { revoked_at: new Date().toISOString() },
  );
}

export async function deleteExpiredCodes(): Promise<void> {
  // Optional cleanup — call from a cron if hygiene matters. Not invoked in V1.
  await sbDelete("oauth_codes", `expires_at=lt.${encodeURIComponent(new Date().toISOString())}`);
}
