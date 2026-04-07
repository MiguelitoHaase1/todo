/**
 * Supabase REST API client for the tasks database.
 * Uses fetch directly — no SDK dependency.
 */

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_KEY;

function requireEnv(): { url: string; key: string } {
  if (!SB_URL || !SB_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables.");
    process.exit(1);
  }
  return { url: SB_URL, key: SB_KEY };
}

function headers(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
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
    throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  }
  return res.json();
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
    throw new Error(`Supabase POST ${table}: ${res.status} ${await res.text()}`);
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
    throw new Error(`Supabase PATCH ${table}: ${res.status} ${await res.text()}`);
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
    throw new Error(`Supabase DELETE ${table}: ${res.status} ${await res.text()}`);
  }
}

export interface TaskEvent {
  task_id: string;
  event_type: "created" | "status_changed" | "priority_changed" | "deferred" | "due_date_set" | "title_changed";
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

  // PostgREST can't pattern-match on UUID columns, so filter client-side
  const all = await sbSelect<Task>("tasks");
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

  const all = await sbSelect<Task>("tasks");
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
