/**
 * Short-prefix task lookup across a table larger than one PostgREST page.
 *
 * Why this exists: on 2026-09-10 `td done <8-char-prefix>` answered "No task
 * found matching: …" for a task `td list` had just printed. The tasks table held 1282
 * rows; PostgREST caps an unbounded select at 1000 and returns the first page
 * silently, with no error and no signal that anything was truncated. `resolveTask`
 * fetched that one page and filtered client-side, so every task past row 1000 —
 * which means every recently created task — was invisible to `done`, `show` and
 * every other prefix lookup.
 *
 * The failure is quiet in the worst way: the row exists, `list` shows it, and the
 * CLI insists it does not exist. Six integration tests in `cli.test.ts` had been
 * failing on exactly this and nobody saw them, because `npm test` globbed
 * `src/**\/*.test.ts` under `sh`, which never matched the top-level `src/*.test.ts`
 * files at all.
 *
 * These stub global fetch — the single external seam the Supabase layer uses — so
 * no real project is touched and no production seam is added.
 */

import { describe, it, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const PAGE = 1000;

/** A page of ids shaped like PostgREST rows. */
function row(id: string) {
  return { id, title: `task ${id.slice(0, 8)}`, status: "open", priority: 2 };
}

describe("resolveTask — tables larger than one PostgREST page", () => {
  let resolveTaskOrThrow: (idPrefix: string) => Promise<{ id: string }>;
  const realFetch = globalThis.fetch;
  const savedUrl = process.env.SUPABASE_URL;
  const savedKey = process.env.SUPABASE_KEY;

  /** 1282 rows: the real count when this bug was found. The target is last. */
  const TARGET = "9dd52756-0000-4000-8000-000000000000";
  const all = [
    ...Array.from({ length: 1281 }, (_, i) =>
      row(`${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`),
    ),
    row(TARGET),
  ];

  let requestedRanges: string[] = [];

  before(async () => {
    ({ resolveTaskOrThrow } = await import("./supabase.ts"));
  });

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_KEY = "stub-key";
    requestedRanges = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const urlStr =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      // Exact-id lookups answer directly, like PostgREST does.
      const eq = urlStr.match(/id=eq\.([0-9a-f-]+)/i);
      if (eq) {
        const hit = all.filter((r) => r.id === eq[1]);
        return new Response(JSON.stringify(hit), { status: 200 });
      }

      // Unbounded select: serve at most one page, and honour Range if asked.
      const range = (init?.headers as Record<string, string> | undefined)?.["Range"];
      requestedRanges.push(range ?? "(none)");
      let start = 0;
      let end = PAGE - 1;
      if (range) {
        const [a, b] = range.split("-").map(Number);
        start = a;
        end = Math.min(b, a + PAGE - 1);
      }
      const slice = all.slice(start, end + 1);
      const last = start + slice.length - 1;
      return new Response(JSON.stringify(slice), {
        status: slice.length ? 206 : 200,
        headers: { "Content-Range": `${start}-${Math.max(last, 0)}/${all.length}` },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    if (savedUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.SUPABASE_KEY;
    else process.env.SUPABASE_KEY = savedKey;
  });

  it("finds a task that sits past the first page", async () => {
    const task = await resolveTaskOrThrow("9dd52756");
    assert.equal(task.id, TARGET, "a row `list` can show must be reachable by prefix");
    assert.ok(requestedRanges.length > 1, "it has to page — one request cannot see row 1281");
  });

  it("finds a task on the first page without changing behaviour", async () => {
    const task = await resolveTaskOrThrow("00000005");
    assert.equal(task.id, "00000005-0000-4000-8000-000000000000");
  });

  it("still reports a genuinely absent prefix", async () => {
    await assert.rejects(() => resolveTaskOrThrow("ffffffff"), /No task found matching/);
  });

  it("still reports an ambiguous prefix rather than guessing", async () => {
    // "0000000" matches 00000000…00000009 — ten rows on the first page.
    await assert.rejects(() => resolveTaskOrThrow("0000000"), /Ambiguous ID/);
  });
});
