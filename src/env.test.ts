/**
 * Credential resolution for the `td` CLI.
 *
 * Why these tests exist: the Sunday 18:00 weekly groom fired for the first time
 * on 2026-08-02 and did nothing — `td groom` exited with "Missing SUPABASE_URL
 * or SUPABASE_KEY". A launchd job does not inherit Michael's interactive shell,
 * and `td` read `process.env` and nothing else, so it worked by hand and failed
 * on every schedule. `crm` hit the identical bug on 2026-07-18 and fixed it by
 * loading its own package env file; `td` never got the same treatment.
 *
 * Patching the launchd plist would fix one caller. Loading the file fixes every
 * caller forever, including the next scheduled job anyone adds — so that is
 * what these pin.
 *
 * The property worth keeping from the failed run: it failed LOUDLY and read
 * nothing, rather than silently grooming an empty backlog. A missing credential
 * must still be an error, never a quiet empty result.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDotEnv, loadDotEnv } from "./env.ts";

const VARS = ["SUPABASE_URL", "SUPABASE_KEY"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const v of VARS) {
    saved[v] = process.env[v];
    delete process.env[v];
  }
});

afterEach(() => {
  for (const v of VARS) {
    if (saved[v] === undefined) delete process.env[v];
    else process.env[v] = saved[v];
  }
});

/** A throwaway package root carrying an env file. Never touches the real one. */
function fixtureRoot(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "td-env-"));
  writeFileSync(join(dir, ".env"), contents);
  return dir;
}

describe("parseDotEnv", () => {
  it("reads plain KEY=VALUE pairs", () => {
    const out = parseDotEnv("SUPABASE_URL=https://x.supabase.co\nSUPABASE_KEY=abc123\n");
    assert.equal(out.SUPABASE_URL, "https://x.supabase.co");
    assert.equal(out.SUPABASE_KEY, "abc123");
  });

  it("skips blanks and comments, tolerates `export `, strips one quote layer", () => {
    const out = parseDotEnv([
      "# a comment",
      "",
      "export SUPABASE_URL=\"https://y.supabase.co\"",
      "SUPABASE_KEY='k'",
    ].join("\n"));
    assert.equal(out.SUPABASE_URL, "https://y.supabase.co");
    assert.equal(out.SUPABASE_KEY, "k");
  });

  it("skips a value with an unterminated quote rather than loading it mangled", () => {
    // These credentials front a live database. A valid-but-wrong value loads
    // silently and resurfaces as an opaque 401; a missing one throws a clear
    // error. Prefer the clear error.
    const warnings: string[] = [];
    const out = parseDotEnv('SUPABASE_KEY="abc\n', (m) => warnings.push(m));
    assert.equal(out.SUPABASE_KEY, undefined, "mangled value must not load");
    assert.equal(warnings.length, 1, "and the skip must be reported, not swallowed");
  });
});

describe("loadDotEnv", () => {
  it("resolves credentials when the shell exported nothing — the scheduled-job case", () => {
    const root = fixtureRoot("SUPABASE_URL=https://sched.supabase.co\nSUPABASE_KEY=sched-key\n");
    try {
      assert.equal(process.env.SUPABASE_URL, undefined, "precondition: env is bare");
      loadDotEnv(root);
      assert.equal(process.env.SUPABASE_URL, "https://sched.supabase.co");
      assert.equal(process.env.SUPABASE_KEY, "sched-key");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("never overrides a variable the shell already exported", () => {
    const root = fixtureRoot("SUPABASE_URL=https://file.supabase.co\n");
    try {
      process.env.SUPABASE_URL = "https://shell.supabase.co";
      loadDotEnv(root);
      assert.equal(
        process.env.SUPABASE_URL,
        "https://shell.supabase.co",
        "a deliberate per-invocation override must still win",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("is a no-op when the file is absent, and safe to call twice", () => {
    const empty = mkdtempSync(join(tmpdir(), "td-env-none-"));
    try {
      assert.doesNotThrow(() => { loadDotEnv(empty); loadDotEnv(empty); });
      assert.equal(process.env.SUPABASE_URL, undefined);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("requireEnv — still fails loudly when there is nothing to load", () => {
  it("throws rather than returning empty credentials", async () => {
    // The one good property of the 2026-08-02 failure: it read nothing and said
    // so. A groom that silently returns an empty backlog would look like a clean
    // backlog, which is worse than an error.
    const { requireEnv } = await import("./supabase.ts");
    const empty = mkdtempSync(join(tmpdir(), "td-env-bare-"));
    try {
      assert.throws(() => requireEnv(empty), /SUPABASE_URL|SUPABASE_KEY/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
