/**
 * Parse an application/x-www-form-urlencoded request body from a Vercel
 * function. Vercel's Node runtime usually parses it into an object on
 * `req.body`; this helper handles both that case and the raw-string fallback.
 */

import type { VercelRequest } from "@vercel/node";

export function parseFormBody(req: VercelRequest): Record<string, string> {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.body)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  if (typeof req.body === "string") {
    const out: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(req.body).entries()) out[k] = v;
    return out;
  }
  return {};
}
