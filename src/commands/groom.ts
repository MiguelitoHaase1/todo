/**
 * groom — weekly backlog grooming command.
 *
 * Pulls the oldest undated open tasks, proposes one of three actions per
 * task (drop / soon / later), and applies Michael's reply deltas.
 *
 * Hypothesis a36548e3: drain the undated-task pile 20-30 tasks at a time.
 */

import { sbSelect, sbUpdate, emitTaskEvent, type Task } from "../supabase.ts";
import { priorityLabel } from "../format.ts";

export type GroomAction = "drop" | "soon" | "later" | "keep" | "skip";

export interface GroomItem {
  index: number;
  task: Task;
  proposed: "drop" | "soon" | "later";
  ageDays: number;
}

export interface ParsedGroomAction {
  index: number;
  action: GroomAction;
  /** Resolved ISO date for soon / later; omitted for drop / keep / skip. */
  dueDate?: string;
}

const DEFAULT_LIMIT = 25;
const SOON_DEFAULT_DAYS = 3;
const LATER_DEFAULT_DAYS = 14;

const URGENCY_TOKENS = [
  "urgent",
  "asap",
  "blocker",
  "broken",
  "fix",
  "prod",
  "outage",
];

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso.slice(0, 10));
  const to = new Date(toIso.slice(0, 10));
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso.slice(0, 10));
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function proposeGroomAction(
  task: Task,
  today: string,
): "drop" | "soon" | "later" {
  const ageDays = daysBetween(task.created_at, today);
  const titleLower = task.title.toLowerCase();
  const urgent = URGENCY_TOKENS.some((t) => titleLower.includes(t));

  if (urgent) return "soon";
  if (task.priority <= 1) return "soon";
  if (task.priority >= 4 && ageDays >= 30) return "drop";
  if (task.priority >= 3 && ageDays >= 60) return "drop";
  return "later";
}

const WEEKDAYS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function parseGroomDate(token: string, today: string): string | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  if (t in WEEKDAYS) {
    const targetDow = WEEKDAYS[t];
    const todayDow = new Date(today).getUTCDay();
    let offset = targetDow - todayDow;
    if (offset <= 0) offset += 7; // always the NEXT occurrence, never today
    return addDays(today, offset);
  }

  const relMatch = t.match(/^(\d+)([dwm])$/);
  if (relMatch) {
    const n = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    if (unit === "d") return addDays(today, n);
    if (unit === "w") return addDays(today, n * 7);
    if (unit === "m") return addMonths(today, n);
  }

  return null;
}

export function parseGroomReply(
  reply: string,
  maxIndex: number,
  today: string,
): ParsedGroomAction[] {
  const actions: ParsedGroomAction[] = [];
  const parts = reply
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    const match = part.match(
      /^(\d+)\s+(drop|soon|later|keep|skip)(?::([^\s,;]+))?$/i,
    );
    if (!match) continue;
    const index = parseInt(match[1], 10);
    if (index < 1 || index > maxIndex) continue;
    const action = match[2].toLowerCase() as GroomAction;
    const dateTok = match[3];

    if (action === "soon" || action === "later") {
      let dueDate: string | null = null;
      if (dateTok) dueDate = parseGroomDate(dateTok, today);
      if (!dueDate) {
        dueDate = addDays(
          today,
          action === "soon" ? SOON_DEFAULT_DAYS : LATER_DEFAULT_DAYS,
        );
      }
      actions.push({ index, action, dueDate });
    } else {
      actions.push({ index, action });
    }
  }

  return actions;
}

export async function buildGroomList(
  limit: number = DEFAULT_LIMIT,
  today: string = new Date().toISOString().slice(0, 10),
): Promise<{ items: GroomItem[]; totalUndated: number }> {
  const allUndated = await sbSelect<Task>(
    "tasks",
    "status=eq.open&due_date=is.null",
    "created_at.asc",
  );
  const totalUndated = allUndated.length;
  const batch = allUndated.slice(0, limit);
  const items: GroomItem[] = batch.map((task, i) => ({
    index: i + 1,
    task,
    proposed: proposeGroomAction(task, today),
    ageDays: daysBetween(task.created_at, today),
  }));
  return { items, totalUndated };
}

export function formatGroomMessage(
  items: GroomItem[],
  totalUndated: number,
): string {
  if (items.length === 0) {
    return "Nothing to groom — no undated open tasks.";
  }

  const lines = [
    `Grooming ${items.length} of ${totalUndated} undated tasks (oldest first):\n`,
  ];
  for (const item of items) {
    lines.push(
      `${item.index}. [${item.proposed}] ${item.task.title} (${priorityLabel(item.task.priority)}, ${item.ageDays}d old)`,
    );
  }
  lines.push("");
  lines.push(
    "Reply per task: `<n> drop`, `<n> soon[:date]`, `<n> later[:date]`, `<n> keep`, `<n> skip`",
  );
  lines.push(
    "Date tokens: ISO (`2026-05-15`), weekday (`mon`), relative (`3d`, `2w`, `1m`). Defaults: soon=+3d, later=+2w.",
  );
  lines.push("Example: `1 drop, 2 soon:tue, 3 later:2w, 4 keep, 5 skip`");
  return lines.join("\n");
}

export async function executeGroomActions(
  items: GroomItem[],
  actions: ParsedGroomAction[],
  source: "triage" | "mcp" = "triage",
): Promise<string> {
  const itemMap = new Map(items.map((i) => [i.index, i]));
  const seen = new Set<string>();
  const ops: { item: GroomItem; parsed: ParsedGroomAction }[] = [];

  for (const parsed of actions) {
    const item = itemMap.get(parsed.index);
    if (!item || seen.has(item.task.id)) continue;
    seen.add(item.task.id);
    ops.push({ item, parsed });
  }

  if (ops.length === 0) return "No actions taken.";

  const counts = { drop: 0, soon: 0, later: 0, kept: 0, skipped: 0, failed: 0 };
  const writes = ops.filter(
    (op) => op.parsed.action === "drop" || op.parsed.action === "soon" || op.parsed.action === "later",
  );

  const results = await Promise.allSettled(
    writes.map(({ item, parsed }) => {
      if (parsed.action === "drop") {
        return sbUpdate("tasks", `id=eq.${item.task.id}`, {
          status: "dropped",
        });
      }
      return sbUpdate("tasks", `id=eq.${item.task.id}`, {
        due_date: parsed.dueDate,
      });
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const { item, parsed } = writes[i];
    if (results[i].status !== "fulfilled") {
      counts.failed++;
      continue;
    }
    if (parsed.action === "drop") {
      counts.drop++;
      emitTaskEvent({
        task_id: item.task.id,
        event_type: "status_changed",
        previous_value: item.task.status,
        new_value: "dropped",
        source,
      });
    } else {
      if (parsed.action === "soon") counts.soon++;
      else if (parsed.action === "later") counts.later++;
      emitTaskEvent({
        task_id: item.task.id,
        event_type: "due_date_set",
        previous_value: "none",
        new_value: parsed.dueDate ?? "",
        source,
      });
    }
  }

  for (const { parsed } of ops) {
    if (parsed.action === "keep") counts.kept++;
    else if (parsed.action === "skip") counts.skipped++;
  }

  const parts = [
    `Groomed ${ops.length}`,
    `${counts.drop} dropped`,
    `${counts.soon} soon`,
    `${counts.later} later`,
    `${counts.kept} kept`,
    `${counts.skipped} skipped`,
  ];
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);
  return parts.join(" — ");
}

export async function cmdGroom(args: string[]): Promise<void> {
  const jsonMode = args.includes("--json");
  const nonFlag = args.filter((a) => !a.startsWith("-"));

  if (nonFlag[0] === "exec") {
    const reply = nonFlag.slice(1).join(" ");
    if (!reply) {
      console.error('Usage: td groom exec "1 drop, 2 soon:tue"');
      process.exit(1);
    }
    const { items } = await buildGroomList();
    if (items.length === 0) {
      console.log(jsonMode ? JSON.stringify({ summary: "Nothing to groom." }) : "Nothing to groom.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const actions = parseGroomReply(reply, items.length, today);
    if (actions.length === 0) {
      console.error(`Could not parse groom reply: "${reply}"`);
      process.exit(1);
    }
    const summary = await executeGroomActions(items, actions);
    console.log(jsonMode ? JSON.stringify({ summary, actions }) : summary);
    return;
  }

  const limit = nonFlag[0] ? parseInt(nonFlag[0], 10) : DEFAULT_LIMIT;
  const { items, totalUndated } = await buildGroomList(
    Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
  );

  if (jsonMode) {
    console.log(JSON.stringify({ items, totalUndated }, null, 2));
    return;
  }
  console.log(formatGroomMessage(items, totalUndated));
}
