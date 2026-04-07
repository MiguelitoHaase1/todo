/**
 * MCP endpoint — JWT-gated Streamable HTTP transport.
 *
 * Validates a Bearer access token (JWT signed with JWT_SIGNING_KEY) on every
 * request. On 401, returns a `WWW-Authenticate` header pointing at the
 * Protected Resource Metadata so clients (claude.ai, Claude Code) can
 * discover the OAuth flow.
 *
 * Stateless mode: each request gets a fresh transport, no session reuse.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { server } from "../src/server.js";
import { validateAccessToken, UnauthorizedError } from "../src/auth/middleware.js";
import { getProtectedResourceMetadataUrl, getMcpResourceUrl } from "../src/config.js";

function setWwwAuthenticate(res: VercelResponse, errorDescription: string): void {
  // RFC 9728 / RFC 6750 — point clients at the resource metadata so they can
  // discover the authorization server and run the OAuth flow.
  const metadataUrl = getProtectedResourceMetadataUrl();
  res.setHeader(
    "WWW-Authenticate",
    `Bearer realm="todolist", resource_metadata="${metadataUrl}", error="invalid_token", error_description="${errorDescription}"`,
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // Auth gate
  try {
    await validateAccessToken(req.headers);
  } catch (e: unknown) {
    if (e instanceof UnauthorizedError) {
      setWwwAuthenticate(res, e.message);
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "unauthorized", data: { reason: e.message, resource: getMcpResourceUrl() } },
        id: null,
      });
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mcp] auth threw unexpectedly:", msg);
    res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "internal error" }, id: null });
    return;
  }

  // Hand off to the MCP transport
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    transport.close().catch((closeErr: unknown) => {
      console.error("[mcp] transport close error:", closeErr instanceof Error ? closeErr.message : closeErr);
    });
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse,
      req.body,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mcp] transport error:", msg);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: msg }, id: null });
    }
  }
}
