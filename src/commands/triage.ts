import { sbSelect, sbUpdate, type Task } from "../supabase.ts";
import { priorityLabel, shortId, formatDate } from "../format.ts";

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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const allOpen = await sbSelect<Task>(
    "tasks",
    "status=eq.open",
    "priority.asc,due_date.asc.nullslast",
  );

  const items: TriageItem[] = [];

  // 1. Tasks due tomorrow
  for (const t of allOpen) {
    if (t.due_date === tomorrowStr) {
      items.push({ index: 0, task: t, reason: "due tomorrow" });
    }
  }

  // 2. Overdue tasks (due before today)
  const todayStr = new Date().toISOString().slice(0, 10);
  for (const t of allOpen) {
    if (t.due_date && t.due_date < todayStr) {
      items.push({ index: 0, task: t, reason: "overdue" });
    }
  }

  // 3. Low-priority tasks (P3/P4) with no due date — stale candidates
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 7);
  const staleStr = staleThreshold.toISOString();

  for (const t of allOpen) {
    if (
      t.priority >= 3 &&
      !t.due_date &&
      t.updated_at < staleStr
    ) {
      items.push({ index: 0, task: t, reason: "stale, no date" });
    }
  }

  // Deduplicate by task ID
  const seen = new Set<string>();
  const unique: TriageItem[] = [];
  for (const item of items) {
    if (!seen.has(item.task.id)) {
      seen.add(item.task.id);
      unique.push(item);
    }
  }

  // Number them 1..N
  return unique.map((item, i) => ({ ...item, index: i + 1 }));
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
  const results: string[] = [];

  for (const { action, indices } of actions) {
    for (const idx of indices) {
      const item = items.find((i) => i.index === idx);
      if (!item) continue;

      switch (action) {
        case "drop": {
          await sbUpdate("tasks", `id=eq.${item.task.id}`, {
            status: "done",
          });
          results.push(`Dropped: ${item.task.title}`);
          break;
        }
        case "defer": {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().slice(0, 10);
          await sbUpdate("tasks", `id=eq.${item.task.id}`, {
            due_date: nextWeekStr,
          });
          results.push(`Deferred to ${nextWeekStr}: ${item.task.title}`);
          break;
        }
        case "keep":
          results.push(`Kept: ${item.task.title}`);
          break;
      }
    }
  }

  return results.length > 0 ? results.join("\n") : "No actions taken.";
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
