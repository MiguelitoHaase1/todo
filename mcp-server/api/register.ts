/**
 * RFC 7591 — OAuth Dynamic Client Registration.
 *
 * Open registration (no auth required) since we're a personal MCP server
 * and clients (claude.ai, Claude Code) need to register themselves on first
 * connect. The single human gate is the consent passphrase at /authorize —
 * registering a client doesn't grant any access on its own.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { registerClient } from "../src/auth/store.js";

interface RegistrationRequest {
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "claude:";
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const body = (req.body ?? {}) as RegistrationRequest;
  const redirectUris = body.redirect_uris ?? [];
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    res.status(400).json({ error: "invalid_redirect_uri", error_description: "redirect_uris is required" });
    return;
  }
  for (const uri of redirectUris) {
    if (!isValidRedirectUri(uri)) {
      res.status(400).json({ error: "invalid_redirect_uri", error_description: `not a valid URI: ${uri}` });
      return;
    }
  }

  const clientId = randomUUID();

  try {
    const created = await registerClient({
      client_id: clientId,
      client_secret_hash: null,
      client_name: body.client_name ?? "unnamed-client",
      redirect_uris: redirectUris,
      grant_types: body.grant_types ?? ["authorization_code", "refresh_token"],
      response_types: body.response_types ?? ["code"],
      token_endpoint_auth_method: body.token_endpoint_auth_method ?? "none",
    });

    res.status(201).json({
      client_id: created.client_id,
      client_name: created.client_name,
      redirect_uris: created.redirect_uris,
      grant_types: created.grant_types,
      response_types: created.response_types,
      token_endpoint_auth_method: created.token_endpoint_auth_method,
      client_id_issued_at: Math.floor(new Date(created.created_at).getTime() / 1000),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[register] failed:", msg);
    res.status(500).json({ error: "server_error", error_description: msg });
  }
}
