/**
 * Loads the package-root env file into process.env.
 *
 * Why this exists: `td` is launched from everywhere — the PATH shim, the MCP
 * server, and scheduled launchd jobs. None of those inherit SUPABASE_URL /
 * SUPABASE_KEY, because nothing in the shell profile exports them. So `td`
 * worked by hand and failed on every schedule. The Sunday 18:00 weekly groom
 * fired for the first time on 2026-08-02 and exited with "Missing SUPABASE_URL
 * or SUPABASE_KEY" while a perfectly good env file sat unread in the package
 * root.
 *
 * Patching the launchd plist would have fixed that one caller. Loading the file
 * here fixes every caller, including the next scheduled job anyone adds — which
 * is the whole point, since the failure mode is a job that looks installed and
 * quietly does nothing.
 *
 * `crm` hit this exact bug on 2026-07-18 and solved it this way; `td` never got
 * the same treatment. This is a deliberate port rather than a shared import —
 * the two live in separate repos.
 *
 * Shell env always wins: an explicitly exported var is never overridden by the
 * file, so per-invocation overrides and CI still work.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Parse env-file text into key/value pairs. Skips blanks and `#` comments,
 * tolerates a leading `export `, and strips one layer of matching quotes.
 *
 * Malformed lines are REPORTED via `onWarn`, not swallowed. These credentials
 * front a live database, so the dangerous outcome is a valid-but-wrong value
 * loading silently and resurfacing later as an opaque 401. A value that opens a
 * quote it never closes is therefore SKIPPED rather than loaded with the stray
 * quote attached — a missing var throws a clear "Missing SUPABASE_URL…", which
 * is far easier to diagnose than a subtly bad key.
 *
 * Deliberately NOT handled: trailing inline comments (`K=v # note`). Stripping
 * them requires guessing, and a value may legitimately contain " #".
 */
export function parseDotEnv(
  text: string,
  onWarn: (msg: string) => void = () => {},
): Record<string, string> {
  const out: Record<string, string> = {};
  text.split("\n").forEach((raw, i) => {
    const lineNo = i + 1;
    const line = raw.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq <= 0) {
      onWarn(`env line ${lineNo}: ignored, no KEY=VALUE (${truncate(line)})`);
      return;
    }
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const opensQuote = val.startsWith('"') || val.startsWith("'");
    const closesQuote = val.length >= 2 && val.endsWith(val[0]!);
    if (opensQuote && !closesQuote) {
      onWarn(`env line ${lineNo}: ignored ${key}, unterminated quote`);
      return;
    }
    if (opensQuote) val = val.slice(1, -1);
    if (key in out) onWarn(`env line ${lineNo}: ${key} redefined, last wins`);
    out[key] = val;
  });
  return out;
}

function truncate(s: string, n = 40): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/**
 * Package root — one level up from src/.
 *
 * Anchored to THIS file's location, never the caller's cwd: a scheduled job
 * starts wherever launchd puts it, and resolving from cwd would just move the
 * bug rather than fix it.
 */
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Credentials that only mean anything together. A URL from one Supabase project
 * and a key from another is not a partial configuration — it is a broken one.
 */
const PAIRS: readonly (readonly string[])[] = [["SUPABASE_URL", "SUPABASE_KEY"]];

/**
 * Merge `<root>/.env` into process.env without clobbering existing vars.
 * No-op when the file is absent. Safe to call repeatedly.
 *
 * One exception to "shell always wins", added 2026-09-10: if the shell exported
 * only PART of a pair above and the file supplies the whole pair, the file wins
 * for the whole pair.
 *
 * Why: a stray `SUPABASE_URL` for an unrelated project sat in a long-running
 * session's environment with no matching `SUPABASE_KEY`. The old rule kept that
 * URL and loaded this package's key next to it, so every request paired one
 * project's URL with another project's key. Supabase answers that with
 * `401 Invalid API key … might also be owned by another Supabase project`, which
 * reads exactly like a rotated credential. `td` and `crm` were both dark for
 * hours and the 401 was reported upward as "no todos" — the silent-wrong-value
 * failure this file's parser already goes out of its way to avoid.
 *
 * A deliberate override is unaffected: exporting both halves still wins. Nobody
 * overrides a credential by exporting half of it.
 */
export function loadDotEnv(root: string = PKG_ROOT): void {
  const path = join(root, ".env");
  if (!existsSync(path)) return;
  const fromFile = parseDotEnv(readFileSync(path, "utf8"));

  const forced = new Set<string>();
  for (const pair of PAIRS) {
    const fileHasAll = pair.every((k) => fromFile[k] !== undefined);
    const shellHasSome = pair.some((k) => process.env[k] !== undefined);
    const shellHasAll = pair.every((k) => process.env[k] !== undefined);
    if (fileHasAll && shellHasSome && !shellHasAll) pair.forEach((k) => forced.add(k));
  }

  for (const [key, val] of Object.entries(fromFile)) {
    if (forced.has(key) || process.env[key] === undefined) process.env[key] = val;
  }
}
