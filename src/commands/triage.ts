import { sbSelect, sbUpdate, type Task } from "../supabase.ts";
import { priorityLabel, formatDate } from "../format.ts";

export interface TriageItem {
  index: number;
  task: Task;
  reason: string;
}

/**
 * Build the triage list: tasks due tomorrow + stale/low-priority open tasks.
 * Returns items numbered 1..N for easy iMessage replies.
 */
export async function buildTriageList(): Promise<TriageItem[]> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  const staleStr = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);

  const allOpen = await sbSelect<Task>(
    "tasks",
    "status=eq.open",
    "priority.asc,due_date.asc.nullslast",
  );

  // Single pass — a task can match multiple categories, keep first match only
  const seen = new Set<string>();
  const items: TriageItem[] = [];

  for (const t of allOpen) {
    if (seen.has(t.id)) continue;

    let reason: string | null = null;
    if (t.due_date && t.due_date < todayStr) {
      reason = "overdue";
    } else if (t.due_date === tomorrowStr) {
      reason = "due tomorrow";
    } else if (t.priority >= 3 && !t.due_date && t.updated_at.slice(0, 10) < staleStr) {
      reason = "stale, no date";
    }

    if (reason) {
      seen.add(t.id);
      items.push({ index: items.length + 1, task: t, reason });
    }
  }

  return items;
}

/**
 * Format triage list for iMessage. Short, scannable.
 */
export function formatTriageMessage(items: TriageItem[]): string {
  if (items.length === 0) {
    return "Nothing to triage — you're clean.";
  }

  const lines = [`${items.length} tasks to triage:\n`];
  for (const item of items) {
    const due = item.task.due_date ? formatDate(item.task.due_date) : "no date";
    lines.push(
      `${item.index}. ${item.task.title} (${priorityLabel(item.task.priority)}, ${due}) — ${item.reason}`,
    );
  }
  lines.push("");
  lines.push("Reply: drop 1, defer 3, keep 2");
  lines.push("Or: drop all, keep all");
  return lines.join("\n");
}

type TriageAction = "drop" | "defer" | "keep";

interface ParsedAction {
  action: TriageAction;
  indices: number[];
}

/**
 * Parse a triage reply like "drop 1 3, defer 2, keep 4"
 * Also handles "drop all", "keep all"
 */
export function parseTriageReply(
  reply: string,
  maxIndex: number,
): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const normalized = reply.toLowerCase().trim();

  // Handle "drop all" / "keep all" / "defer all"
  const allMatch = normalized.match(/^(drop|defer|keep)\s+all$/);
  if (allMatch) {
    const action = allMatch[1] as TriageAction;
    const allIndices = Array.from({ length: maxIndex }, (_, i) => i + 1);
    return [{ action, indices: allIndices }];
  }

  // Split on comma or semicolon
  const parts = normalized.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^(drop|defer|keep)\s+([\d\s]+)$/);
    if (match) {
      const action = match[1] as TriageAction;
      const indices = match[2]
        .split(/\s+/)
        .map(Number)
        .filter((n) => n >= 1 && n <= maxIndex);
      if (indices.length > 0) {
        actions.push({ action, indices });
      }
    }
  }

  return actions;
}

/**
 * Execute triage actions on tasks. Returns a summary string.
 */
export async function executeTriageActions(
  items: TriageItem[],
  actions: ParsedAction[],
): Promise<string> {
  const itemMap = new Map(items.map((i) => [i.index, i]));
  const nextWeekStr = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  // Collect all operations, then execute writes in parallel
  const ops: { item: TriageItem; action: TriageAction }[] = [];
  for (const { action, indices } of actions) {
    for (const idx of indices) {
      const item = itemMap.get(idx);
      if (item) ops.push({ item, action });
    }
  }

  if (ops.length === 0) return "No actions taken.";

  await Promise.all(
    ops
      .filter((op) => op.action !== "keep")
      .map((op) => {
        switch (op.action) {
          case "drop":
            return sbUpdate("tasks", `id=eq.${op.item.task.id}`, { status: "done" });
          case "defer":
            return sbUpdate("tasks", `id=eq.${op.item.task.id}`, { due_date: nextWeekStr });
        }
      }),
  );

  return ops
    .map((op) => {
      switch (op.action) {
        case "drop": return `Dropped: ${op.item.task.title}`;
        case "defer": return `Deferred to ${nextWeekStr}: ${op.item.task.title}`;
        case "keep": return `Kept: ${op.item.task.title}`;
      }
    })
    .join("\n");
}

/**
 * CLI entry: td triage — prints triage summary to stdout.
 * Subcommands:
 *   td triage              — show triage list
 *   td triage exec "reply" — parse and execute a triage reply
 */
export async function cmdTriage(args: string[]): Promise<void> {
  const jsonMode = args.includes("--json");

  // Subcommand: td triage exec "drop 1, defer 2"
  if (args[0] === "exec") {
    const reply = args.slice(1).filter((a) => a !== "--json").join(" ");
    if (!reply) {
      console.error('Usage: td triage exec "drop 1, defer 2"');
      process.exit(1);
    }
    const items = await buildTriageList();
    if (items.length === 0) {
      console.log(jsonMode ? JSON.stringify({ summary: "Nothing to triage." }) : "Nothing to triage.");
      return;
    }
    const actions = parseTriageReply(reply, items.length);
    if (actions.length === 0) {
      console.error(`Could not parse triage reply: "${reply}"`);
      process.exit(1);
    }
    const summary = await executeTriageActions(items, actions);
    if (jsonMode) {
      console.log(JSON.stringify({ summary, actions, items_count: items.length }));
    } else {
      console.log(summary);
    }
    return;
  }

  const items = await buildTriageList();

  if (jsonMode) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  console.log(formatTriageMessage(items));
}
