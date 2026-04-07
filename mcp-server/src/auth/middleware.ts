/**
 * Bearer-token validation for the MCP endpoint.
 *
 * Extracts the Authorization header, verifies the JWT against
 * JWT_SIGNING_KEY + the configured audience (= the public MCP URL).
 * Throws on missing/invalid; the caller turns the throw into a 401
 * with the WWW-Authenticate header pointing at the resource metadata.
 */

import type { IncomingHttpHeaders } from "node:http";
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

export async function validateAccessToken(headers: IncomingHttpHeaders): Promise<AccessTokenClaims> {
  const token = extractBearer(headers);
  try {
    return await verifyAccessToken(token, getMcpResourceUrl());
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new UnauthorizedError(`token verification failed: ${msg}`);
  }
}
