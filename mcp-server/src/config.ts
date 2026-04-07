/**
 * Centralized config and URL helpers.
 *
 * The PUBLIC_URL env var is the canonical base URL of the deployment
 * (e.g. https://todolist-mcp-server.vercel.app or http://localhost:3000).
 * Used to build the well-known metadata, the WWW-Authenticate header,
 * and the JWT audience.
 */

const SUBJECT = "michael";
const SCOPE = "mcp";

export function getPublicUrl(): string {
  const url = process.env.PUBLIC_URL;
  if (!url) {
    throw new Error("PUBLIC_URL env var is not set");
  }
  return url.replace(/\/$/, "");
}

export function getMcpResourceUrl(): string {
  return `${getPublicUrl()}/api/mcp`;
}

export function getProtectedResourceMetadataUrl(): string {
  return `${getPublicUrl()}/.well-known/oauth-protected-resource`;
}

export function getAuthorizationServerMetadataUrl(): string {
  return `${getPublicUrl()}/.well-known/oauth-authorization-server`;
}

export function getDefaultSubject(): string {
  return SUBJECT;
}

export function getDefaultScope(): string {
  return SCOPE;
}
