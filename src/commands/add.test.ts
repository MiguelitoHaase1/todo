import { describe, it, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// supabase.ts reads SUPABASE_URL / SUPABASE_KEY into top-level consts at module
// eval time, so they must exist BEFORE add.ts (which imports it) is loaded.
// ESM imports hoist, so we load add.ts lazily via dynamic import after setting env.
process.env.SUPABASE_URL = "https://test.invalid";
process.env.SUPABASE_KEY = "test-key";

type CmdAdd = (args: string[]) => Promise<void>;

/**
 * Regression guard for the duplicate-task bug (bead AI-7og).
 *
 * Root cause: non-idempotent task creation — a single `td add` must result in
 * exactly ONE row insert and exactly ONE "created" audit event. If `cmdAdd`
 * ever re-inserts (retry loop, double-emit, etc.), a user sees duplicate tasks.
 *
 * We stub the ONLY external seam the Supabase layer uses (global fetch) so the
 * test never touches a real Supabase and no production seam is added. Each
 * POST is recorded by target table; the assertions pin the call counts.
 */
describe("cmdAdd — duplicate-task regression guard", () => {
  let cmdAdd: CmdAdd;
  const realFetch = globalThis.fetch;

  // Records every POST the command issues, keyed by table.
  let posts: { table: string; body: unknown }[] = [];

  before(async () => {
    ({ cmdAdd } = await import("./add.ts"));
  });

  beforeEach(() => {
    posts = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method ?? "GET";
      // /rest/v1/<table>?... → capture the table segment
      const m = urlStr.match(/\/rest\/v1\/([^?]+)/);
      const table = m ? m[1] : urlStr;
      const body = init?.body ? JSON.parse(String(init.body)) : null;

      if (method === "POST") {
        posts.push({ table, body });
        // PostgREST returns the inserted representation as an array.
        const row = {
          id: "11111111-1111-1111-1111-111111111111",
          ...(body as Record<string, unknown>),
        };
        return new Response(JSON.stringify([row]), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("inserts the task exactly once and emits exactly one 'created'/'cli' event", async () => {
    await cmdAdd(["buy milk", "-p", "2", "--json"]);

    const taskInserts = posts.filter((p) => p.table === "tasks");
    const eventInserts = posts.filter((p) => p.table === "task_events");

    // Exactly one row inserted into tasks — no duplicate creation.
    assert.equal(
      taskInserts.length,
      1,
      `expected exactly 1 tasks insert, got ${taskInserts.length}`,
    );

    // Exactly one audit event, of the right type and source.
    assert.equal(
      eventInserts.length,
      1,
      `expected exactly 1 task_events insert, got ${eventInserts.length}`,
    );

    const event = eventInserts[0].body as Record<string, unknown>;
    assert.equal(event.event_type, "created");
    assert.equal(event.source, "cli");

    // Sanity: the inserted task carries the parsed title + priority.
    const task = taskInserts[0].body as Record<string, unknown>;
    assert.equal(task.title, "buy milk");
    assert.equal(task.priority, 2);
  });

  /**
   * `--type` (hypothesis 8aa4d287) — the write path for the kanban card icons.
   *
   * The column is useless without a writer: if nothing sets it, every card
   * stays untyped and shows no icon, which is the failure the hypothesis names
   * as its own kill criterion. So `td add` is where the type gets set, by the
   * person or agent that knows the work.
   */
  it("writes --type onto the row", async () => {
    await cmdAdd(["reply to Bernt", "-p", "1", "--type", "flash", "--json"]);
    const task = posts.filter((p) => p.table === "tasks")[0].body as Record<string, unknown>;
    assert.equal(task.task_type, "flash");
  });

  it("accepts deep as well as flash", async () => {
    await cmdAdd(["write the playbook", "--type", "deep", "--json"]);
    const task = posts.filter((p) => p.table === "tasks")[0].body as Record<string, unknown>;
    assert.equal(task.task_type, "deep");
  });

  // Untyped is the common case and must stay clean — the renderer keys "show no
  // icon" off null, so an empty string or a stray default would break it.
  it("leaves task_type null when --type is not given", async () => {
    await cmdAdd(["book the dentist", "--json"]);
    const task = posts.filter((p) => p.table === "tasks")[0].body as Record<string, unknown>;
    assert.equal(task.task_type, null);
  });

  /**
   * `--agent` (hypothesis 518bd6ee) — what puts a row in the review modal.
   *
   * Since 2026-08-04 agents write unambiguous todos straight to the list rather
   * than proposing them. This flag is the other half of that bargain: the write
   * still happens immediately, but it lands somewhere Michael can undo in one
   * gesture instead of silently joining the plan.
   */
  it("marks an agent write as pending review", async () => {
    await cmdAdd(["send Bernt the pricing one-pager", "-p", "1", "--agent", "--json"]);
    const task = posts.filter((p) => p.table === "tasks")[0].body as Record<string, unknown>;
    assert.equal(task.created_by, "agent");
    assert.equal(task.review_state, "pending");
  });

  it("leaves Michael's own writes out of the review queue entirely", async () => {
    await cmdAdd(["book the dentist", "--json"]);
    const task = posts.filter((p) => p.table === "tasks")[0].body as Record<string, unknown>;
    assert.equal(task.created_by, "michael");
    assert.equal(task.review_state, null, "no review_state means nothing to review");
  });

  it("rejects a type the column would reject anyway, before the round trip", async () => {
    const realExit = process.exit;
    const realErr = console.error;
    let exited: number | undefined;
    let msg = "";
    process.exit = ((code?: number) => {
      exited = code;
      throw new Error("exit");
    }) as never;
    console.error = (m: string) => { msg += m; };
    try {
      await cmdAdd(["something", "--type", "urgent"]);
    } catch {
      /* the stubbed exit throws */
    } finally {
      process.exit = realExit;
      console.error = realErr;
    }
    assert.equal(exited, 1, "exits non-zero");
    assert.match(msg, /flash|deep/, "names the values it will accept");
    assert.equal(posts.filter((p) => p.table === "tasks").length, 0, "nothing was written");
  });
});
