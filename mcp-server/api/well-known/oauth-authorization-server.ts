/**
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata.
 * Lists the AS endpoints, supported flows, and PKCE methods.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPublicUrl } from "../../src/config.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const base = getPublicUrl();
  res.status(200).json({
    issuer: base,
    authorization_endpoint: `${base}/api/authorize`,
    token_endpoint: `${base}/api/token`,
    registration_endpoint: `${base}/api/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
    scopes_supported: ["mcp"],
  });
}
