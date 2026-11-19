/**
 * Static API key path on the MCP endpoint.
 *
 * Lets a client with no OAuth flow (a Lovable "Bearer token" connector, an app's
 * edge function) call the server with a fixed key from MCP_API_KEY. The OAuth
 * path must keep working unchanged next to it.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { matchesApiKey, validateAccessToken, UnauthorizedError } from "./middleware.ts";

const KEY = "k".repeat(48);

describe("matchesApiKey", () => {
  it("accepts the exact configured key", () => {
    assert.equal(matchesApiKey(KEY, KEY), true);
  });

  it("rejects a different key of the same length", () => {
    assert.equal(matchesApiKey("x".repeat(48), KEY), false);
  });

  it("rejects a prefix of the key", () => {
    assert.equal(matchesApiKey(KEY.slice(0, 40), KEY), false);
  });

  it("is off when no key is configured", () => {
    assert.equal(matchesApiKey("", undefined), false);
    assert.equal(matchesApiKey("anything", undefined), false);
    assert.equal(matchesApiKey("", ""), false);
  });

  it("is off when the configured key is shorter than 32 chars", () => {
    const weak = "short-key";
    assert.equal(matchesApiKey(weak, weak), false);
  });
});

describe("validateAccessToken with MCP_API_KEY", () => {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.MCP_API_KEY;
    process.env.MCP_API_KEY = KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.MCP_API_KEY;
    else process.env.MCP_API_KEY = saved;
  });

  it("accepts the static key as a Bearer token", async () => {
    const claims = await validateAccessToken({ authorization: `Bearer ${KEY}` });
    assert.equal(claims.client_id, "static-api-key");
    assert.equal(claims.scope, "mcp");
  });

  it("rejects a wrong key with UnauthorizedError", async () => {
    await assert.rejects(
      validateAccessToken({ authorization: `Bearer ${"x".repeat(48)}` }),
      UnauthorizedError,
    );
  });

  it("still rejects a missing header", async () => {
    await assert.rejects(validateAccessToken({}), UnauthorizedError);
  });

  it("does not accept the key once MCP_API_KEY is removed", async () => {
    delete process.env.MCP_API_KEY;
    await assert.rejects(
      validateAccessToken({ authorization: `Bearer ${KEY}` }),
      UnauthorizedError,
    );
  });
});
