/**
 * PKCE S256 verification per RFC 7636 §4.6.
 *
 * Given a code_verifier received in /token and a code_challenge stored from
 * the original /authorize request, verify that base64url(sha256(verifier))
 * equals the challenge.
 */

import { createHash } from "node:crypto";

export function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function s256Challenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method !== "S256") return false;
  if (!verifier || verifier.length < 43 || verifier.length > 128) return false;
  return s256Challenge(verifier) === challenge;
}
