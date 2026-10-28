/**
 * Supabase REST API client for the tasks database.
 * Uses fetch directly — no SDK dependency.
 */

import { loadDotEnv } from "./env.ts";

/**
 * Resolve credentials, shell first then the package env file.
 *
 * Read LAZILY, not at module load. The previous version captured
 * `process.env.SUPABASE_URL` into a top-level const, so by the time anything
 * could have loaded the env file the value was already fixed as undefined —
 * import order silently decided whether the CLI worked.
 *
 * Throws rather than calling process.exit: `cli.ts` already catches and prints
 * `Error: <message>` before exiting 1, so the failure stays just as loud while
 * becoming testable. Loud is the property to keep — the 2026-08-02 groom failed
 * and read nothing, which is strictly better than silently reporting an empty
 * backlog that looks like a clean one.
 */
export function requireEnv(root?: string): { url: string; key: string } {
  loadDotEnv(root);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_KEY — checked the shell environment and the package env file.",
    );
  }
  return { url, key };
}

function headers(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/**
 * Sanitize PostgREST error responses. Raw bodies contain table/column/
 * constraint names and leak schema detail to anyone who can trigger an
 * error — including remote MCP clients. Log the detail via stderr for
 * local debugging; surface a generic Error upstream.
 */
async function sanitizedError(
  verb: "GET" | "POST" | "PATCH" | "DELETE",
  table: string,
  res: Response,
): Promise<Error> {
  const body = await res.text().catch(() => "<unavailable>");
  console.error(`[supabase] ${verb} ${table} failed: ${res.status} ${body}`);
  return new Error(`Supabase ${verb} ${table} failed (status ${res.status})`);
}

export async function sbSelect<T>(
  table: string,
  query = "",
  orderBy?: string,
): Promise<T[]> {
  const { url, key } = requireEnv();
  const order = orderBy ? `&order=${orderBy}` : "";
  const qs = query ? `&${query}` : "";
  const res = await fetch(`${url}/rest/v1/${table}?select=*${qs}${order}`, {
    headers: headers(key),
  });
  if (!res.ok) {
    throw await sanitizedError("GET", table, res);
  }
  return res.json();
}

/**
 * Every row of a table, paged.
 *
 * `sbSelect` issues one unbounded request, and PostgREST answers an unbounded
 * request with at most `db-max-rows` (1000 on Supabase) — no error, no flag, just
 * a short array. That is fine for a filtered lookup and wrong for anything that
 * scans the whole table client-side.
 *
 * It bit `resolveTask` on 2026-09-10: the tasks table had grown to 1282 rows, so
 * every task created after row 1000 was invisible to `td done <prefix>` and
 * `td show <prefix>` while `td list` displayed it happily. Paging is the fix
 * because the cap is a server setting we do not control and will cross again.
 */
export async function sbSelectAll<T>(
  table: string,
  query = "",
  orderBy?: string,
  pageSize = 1000,
): Promise<T[]> {
  const { url, key } = requireEnv();
  const order = orderBy ? `&order=${orderBy}` : "";
  const qs = query ? `&${query}` : "";
  const out: T[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*${qs}${order}`, {
      headers: { ...headers(key), Range: `${offset}-${offset + pageSize - 1}` },
    });
    if (!res.ok) throw await sanitizedError("GET", table, res);
    const page = (await res.json()) as T[];
    out.push(...page);
    // A short page means the end. Guard the equal-length case too, or a table
    // that is an exact multiple of pageSize would loop one request too long.
    if (page.length < pageSize) return out;
  }
}

export async function sbInsert<T>(
  table: string,
  data: Record<string, unknown>,
): Promise<T> {
  const { url, key } = requireEnv();
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers(key), Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw await sanitizedError("POST", table, res);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function sbUpdate<T>(
  table: string,
  filter: string,
  data: Record<string, unknown>,
): Promise<T> {
  const { url, key } = requireEnv();
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...headers(key), Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw await sanitizedError("PATCH", table, res);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function sbDelete(
  table: string,
  filter: string,
): Promise<void> {
  const { url, key } = requireEnv();
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: headers(key),
  });
  if (!res.ok) {
    throw await sanitizedError("DELETE", table, res);
  }
}

export interface TaskEvent {
  task_id: string;
  event_type: "created" | "status_changed" | "priority_changed" | "deferred" | "due_date_set" | "title_changed" | "description_changed";
  previous_value?: string | null;
  new_value?: string | null;
  source: "cli" | "imessage" | "discord" | "pwa" | "morning" | "triage" | "plan_tomorrow" | "mcp";
}

/** Fire-and-forget audit event. Logs to stderr on failure but never throws. */
export async function emitTaskEvent(event: TaskEvent): Promise<void> {
  try {
    await sbInsert("task_events", event as unknown as Record<string, unknown>);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[audit] failed to emit ${event.event_type}: ${msg}`);
  }
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  due_date: string | null;
  todoist_id: string | null;
  source_message_id: string | null;
  /** Times this task has been deferred. Escalates to "drop or promote?" at 2+. */
  deferral_count: number;
  /**
   * What kind of work this is (hypothesis 8aa4d287) — drives the flash/deep
   * icon on the kanban card in the morning brew. Set at write time by whoever
   * knows the work; `null` is the normal answer and renders no icon, because a
   * guessed badge costs the credibility of the accurate ones.
   */
  task_type: "flash" | "deep" | null;
  /** Who wrote this row. Agents set 'agent' so the review modal can find their writes (518bd6ee). */
  created_by: "michael" | "agent" | "todoist";
  /** null = nothing to review. pending = waiting in the review modal. */
  review_state: "pending" | "accepted" | "dismissed" | null;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  name: string;
  label_type: string;
  color: string | null;
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
  labels: Label;
}

export type LinkType = "related" | "parent";

export interface TaskLink {
  source_id: string;
  target_id: string;
  link_type: LinkType;
  created_at: string;
}

/** Human-readable direction label for a link relative to a given task. */
export function linkDirection(link: TaskLink, fromTaskId: string): string {
  if (link.link_type === "parent") {
    return link.source_id === fromTaskId ? "→ parent of" : "← child of";
  }
  return "↔ related";
}

/** Find links between two specific tasks (checks both directions). */
export async function findLinksBetween(
  taskAId: string,
  taskBId: string,
): Promise<TaskLink[]> {
  return sbSelect<TaskLink>(
    "task_links",
    `or=(and(source_id.eq.${taskAId},target_id.eq.${taskBId}),and(source_id.eq.${taskBId},target_id.eq.${taskAId}))`,
  );
}

/**
 * Resolve a task by full UUID or short prefix.
 * Returns exactly one task or exits with an error.
 */
export async function resolveTask(idPrefix: string): Promise<Task> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidPattern.test(idPrefix)) {
    const tasks = await sbSelect<Task>("tasks", `id=eq.${idPrefix}`);
    if (tasks.length === 0) {
      console.error(`No task found: ${idPrefix}`);
      process.exit(1);
    }
    return tasks[0];
  }

  // PostgREST can't pattern-match on UUID columns, so filter client-side.
  // sbSelectAll, not sbSelect: one page stops at 1000 rows and hides every task
  // created after that (see sbSelectAll).
  const all = await sbSelectAll<Task>("tasks");
  const matches = all.filter((t) => t.id.startsWith(idPrefix));

  if (matches.length === 0) {
    console.error(`No task found matching: ${idPrefix}`);
    process.exit(1);
  }

  if (matches.length > 1) {
    console.error(`Ambiguous ID "${idPrefix}" matches ${matches.length} tasks. Use a longer prefix.`);
    for (const t of matches) {
      console.error(`  ${t.id.slice(0, 8)}  ${t.title}`);
    }
    process.exit(1);
  }

  return matches[0];
}

/**
 * Throwing variant of resolveTask — same lookup logic, but raises an Error
 * instead of calling process.exit. Use this in any non-CLI context (MCP server,
 * library code) where killing the process is the wrong failure mode.
 */
export async function resolveTaskOrThrow(idPrefix: string): Promise<Task> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidPattern.test(idPrefix)) {
    const tasks = await sbSelect<Task>("tasks", `id=eq.${idPrefix}`);
    if (tasks.length === 0) {
      throw new Error(`No task found: ${idPrefix}`);
    }
    return tasks[0];
  }

  const all = await sbSelectAll<Task>("tasks");
  const matches = all.filter((t) => t.id.startsWith(idPrefix));

  if (matches.length === 0) {
    throw new Error(`No task found matching: ${idPrefix}`);
  }

  if (matches.length > 1) {
    const previews = matches.map((t) => `${t.id.slice(0, 8)} ${t.title}`).join(", ");
    throw new Error(
      `Ambiguous ID "${idPrefix}" matches ${matches.length} tasks. Use a longer prefix. Candidates: ${previews}`,
    );
  }

  return matches[0];
}
