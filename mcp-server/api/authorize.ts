/**
 * OAuth /authorize — consent screen + authorization code issuance.
 *
 * GET: validates client_id + redirect_uri + PKCE params, renders the consent
 *      HTML page with hidden fields preserving all parameters.
 * POST: receives the entered passphrase. If it matches OAUTH_CONSENT_PASSWORD,
 *       generates a fresh authorization code, persists it bound to the client
 *       and PKCE challenge, and 302-redirects to redirect_uri?code=...&state=...
 *       On wrong passphrase, re-renders the consent page with an error.
 *
 * The code is a 32-byte random string with a 5-minute TTL.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { getClient, createCode } from "../src/auth/store.js";
import { renderConsentPage } from "../src/auth/consent-page.js";
import { getDefaultSubject, getDefaultScope, getMcpResourceUrl } from "../src/config.js";
import { parseFormBody } from "../src/util/form-body.js";

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REQUIRED_RESPONSE_TYPE = "code";
const REQUIRED_CHALLENGE_METHOD = "S256";

interface AuthorizeParams {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  resource?: string;
}

function badRequest(res: VercelResponse, error: string, description: string): void {
  res.status(400).json({ error, error_description: description });
}

function constantTimeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function validateParams(params: AuthorizeParams): Promise<{ ok: true } | { ok: false; error: string; description: string }> {
  if (!params.client_id) return { ok: false, error: "invalid_request", description: "missing client_id" };
  if (!params.redirect_uri) return { ok: false, error: "invalid_request", description: "missing redirect_uri" };
  if (params.response_type !== REQUIRED_RESPONSE_TYPE) return { ok: false, error: "unsupported_response_type", description: "only response_type=code is supported" };
  if (!params.code_challenge) return { ok: false, error: "invalid_request", description: "missing code_challenge (PKCE required)" };
  if (params.code_challenge_method !== REQUIRED_CHALLENGE_METHOD) return { ok: false, error: "invalid_request", description: "code_challenge_method must be S256" };

  const client = await getClient(params.client_id);
  if (!client) return { ok: false, error: "invalid_client", description: "client not registered" };
  if (!client.redirect_uris.includes(params.redirect_uri)) {
    return { ok: false, error: "invalid_request", description: "redirect_uri does not match any registered URI" };
  }

  return { ok: true };
}

async function renderForGet(req: VercelRequest, res: VercelResponse, params: AuthorizeParams, errorMessage?: string): Promise<void> {
  const validation = await validateParams(params);
  if (!validation.ok) {
    badRequest(res, validation.error, validation.description);
    return;
  }
  const client = (await getClient(params.client_id!))!;
  const html = renderConsentPage({
    clientId: params.client_id!,
    clientName: client.client_name ?? "unnamed client",
    redirectUri: params.redirect_uri!,
    responseType: params.response_type!,
    scope: params.scope ?? getDefaultScope(),
    state: params.state ?? "",
    codeChallenge: params.code_challenge!,
    codeChallengeMethod: params.code_challenge_method!,
    resource: params.resource ?? getMcpResourceUrl(),
    errorMessage,
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === "GET") {
    const q = req.query as Record<string, string>;
    await renderForGet(req, res, {
      client_id: q.client_id,
      redirect_uri: q.redirect_uri,
      response_type: q.response_type,
      scope: q.scope,
      state: q.state,
      code_challenge: q.code_challenge,
      code_challenge_method: q.code_challenge_method,
      resource: q.resource,
    });
    return;
  }

  if (req.method === "POST") {
    const body = parseFormBody(req);
    const params: AuthorizeParams = {
      client_id: body.client_id,
      redirect_uri: body.redirect_uri,
      response_type: body.response_type,
      scope: body.scope,
      state: body.state,
      code_challenge: body.code_challenge,
      code_challenge_method: body.code_challenge_method,
      resource: body.resource,
    };
    const validation = await validateParams(params);
    if (!validation.ok) {
      badRequest(res, validation.error, validation.description);
      return;
    }

    const expected = process.env.OAUTH_CONSENT_PASSWORD;
    if (!expected) {
      res.status(500).json({ error: "server_error", error_description: "OAUTH_CONSENT_PASSWORD not configured" });
      return;
    }
    const submitted = body.passphrase ?? "";
    if (!constantTimeEquals(submitted, expected)) {
      await renderForGet(req, res, params, "Wrong passphrase. Try again.");
      return;
    }

    // Issue authorization code
    const code = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    try {
      await createCode({
        code,
        client_id: params.client_id!,
        redirect_uri: params.redirect_uri!,
        code_challenge: params.code_challenge!,
        code_challenge_method: "S256",
        scope: params.scope ?? getDefaultScope(),
        resource: params.resource ?? getMcpResourceUrl(),
        subject: getDefaultSubject(),
        expires_at: expiresAt,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[authorize] code persistence failed:", msg);
      res.status(500).json({ error: "server_error", error_description: msg });
      return;
    }

    // Build redirect URL
    const redirect = new URL(params.redirect_uri!);
    redirect.searchParams.set("code", code);
    if (params.state) redirect.searchParams.set("state", params.state);

    res.setHeader("Location", redirect.toString());
    res.status(302).end();
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "method_not_allowed" });
}
