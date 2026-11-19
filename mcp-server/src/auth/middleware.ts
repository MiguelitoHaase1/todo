/**
 * Bearer-token validation for the MCP endpoint.
 *
 * Extracts the Authorization header, verifies the JWT against
 * JWT_SIGNING_KEY + the configured audience (= the public MCP URL).
 * Throws on missing/invalid; the caller turns the throw into a 401
 * with the WWW-Authenticate header pointing at the resource metadata.
 */

import type { IncomingHttpHeaders } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { verifyAccessToken, type AccessTokenClaims } from "./jwt.js";
import { getMcpResourceUrl } from "../config.js";

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function extractBearer(headers: IncomingHttpHeaders): string {
  const raw = headers.authorization;
  if (!raw || typeof raw !== "string") {
    throw new UnauthorizedError("missing Authorization header");
  }
  const match = raw.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new UnauthorizedError("Authorization header must use Bearer scheme");
  }
  return match[1].trim();
}

/** Shorter configured keys are ignored, so a weak key can't switch the path on. */
const MIN_API_KEY_LENGTH = 32;

/**
 * True when `token` equals the configured static API key. Constant-time
 * compare. Off when no key is set or the key is too short.
 */
export function matchesApiKey(token: string, configured: string | undefined): boolean {
  if (!configured || configured.length < MIN_API_KEY_LENGTH) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Accepts either the static key in MCP_API_KEY (for clients with no OAuth
 * flow, e.g. a Lovable Bearer-token connector or an app backend) or an
 * OAuth access token (JWT).
 */
export async function validateAccessToken(headers: IncomingHttpHeaders): Promise<AccessTokenClaims> {
  const token = extractBearer(headers);
  if (matchesApiKey(token, process.env.MCP_API_KEY)) {
    return { sub: "michael", scope: "mcp", client_id: "static-api-key" };
  }
  try {
    return await verifyAccessToken(token, getMcpResourceUrl());
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new UnauthorizedError(`token verification failed: ${msg}`);
  }
}
