/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 * Tells clients where to find the authorization server.
 *
 * The MCP spec requires this endpoint at the well-known path
 * `/.well-known/oauth-protected-resource` (handled by the rewrite in vercel.json).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getMcpResourceUrl,
  getPublicUrl,
  getDefaultScope,
} from "../../src/config.js";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  res.status(200).json({
    resource: getMcpResourceUrl(),
    authorization_servers: [getPublicUrl()],
    bearer_methods_supported: ["header"],
    scopes_supported: [getDefaultScope()],
    resource_documentation: `${getPublicUrl()}/`,
  });
}
