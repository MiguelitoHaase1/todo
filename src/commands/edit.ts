/**
 * td edit — update a task in place.
 *
 * Usage:
 *   td edit <id> [--title "new title"] [-d|--description "new desc"]
 *               [-p|--priority 0-4] [--due YYYY-MM-DD] [--notes "text"]
 *   td update is the same command.
 *
 *   - --notes appends a dated line to the description and keeps what is there.
 *   - Passing an empty string to --description or --due clears the field.
 *   - Fields not provided are left unchanged.
 *   - One task_events row is emitted per changed field.
 */

import { resolveTask, sbUpdate, emitTaskEvent, type Task, type TaskEvent } from "../supabase.ts";
import { shortId } from "../format.ts";

interface ParsedArgs {
  id: string;
  title?: string;
  description?: string;
  priority?: number;
  dueDate?: string;
  notes?: string;
  jsonMode: boolean;
}

function parseArgs(args: string[]): ParsedArgs {
  const jsonMode = args.includes("--json");
  const filtered = args.filter((a) => a !== "--json");

  const out: ParsedArgs = { id: "", jsonMode };

  for (let i = 0; i < filtered.length; i++) {
    const arg = filtered[i];
    if (arg === "--title") {
      out.title = filtered[++i];
    } else if (arg === "-d" || arg === "--description") {
      // Allow empty string to clear.
      out.description = filtered[++i] ?? "";
    } else if (arg === "-p" || arg === "--priority") {
      const val = filtered[++i];
      const p = parseInt(val, 10);
      if (isNaN(p) || p < 0 || p > 4) {
        console.error(`Invalid priority: ${val} (must be 0-4)`);
        process.exit(1);
      }
      out.priority = p;
    } else if (arg === "--due") {
      const val = filtered[++i] ?? "";
      if (val !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        console.error(`Invalid due date: ${val} (use YYYY-MM-DD or empty string to clear)`);
        process.exit(1);
      }
      out.dueDate = val;
    } else if (arg === "--notes") {
      out.notes = filtered[++i] ?? "";
    } else if (!arg.startsWith("-") && !out.id) {
      out.id = arg;
    }
  }

  return out;
}

/** Compute the patch + events — same semantics as the MCP tool. */
export function computeEditUpdates(
  task: Task,
  args: {
    title?: string;
    description?: string;
    priority?: number;
    due_date?: string;
    notes?: string;
  },
  today: string = new Date().toISOString().slice(0, 10),
): {
  updates: Record<string, unknown>;
  events: Array<Omit<TaskEvent, "task_id" | "source">>;
} {
  const updates: Record<string, unknown> = {};
  const events: Array<Omit<TaskEvent, "task_id" | "source">> = [];

  if (args.title !== undefined && args.title !== task.title) {
    updates.title = args.title;
    events.push({
      event_type: "title_changed",
      previous_value: task.title,
      new_value: args.title,
    });
  }

  let next = task.description ?? null;
  if (args.description !== undefined) next = args.description === "" ? null : args.description;
  const note = args.notes?.trim();
  if (note) {
    const line = `Note ${today}: ${note}`;
    next = next ? `${next}\n\n${line}` : line;
  }
  if (args.description !== undefined || note) {
    if (next !== task.description) {
      updates.description = next;
      events.push({
        event_type: "description_changed",
        previous_value: task.description ?? null,
        new_value: next,
      });
    }
  }

  if (args.priority !== undefined && args.priority !== task.priority) {
    updates.priority = args.priority;
    events.push({
      event_type: "priority_changed",
      previous_value: String(task.priority),
      new_value: String(args.priority),
    });
  }

  if (args.due_date !== undefined) {
    const next = args.due_date === "" ? null : args.due_date;
    if (next !== task.due_date) {
      updates.due_date = next;
      events.push({
        event_type: "due_date_set",
        previous_value: task.due_date ?? null,
        new_value: next,
      });
    }
  }

  return { updates, events };
}

export async function cmdEdit(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (!parsed.id) {
    console.error(
      'Usage: td edit <id> [--title "new"] [-d "desc" | -d ""] [-p 0-4] [--due YYYY-MM-DD | --due ""] [--notes "text"]',
    );
    process.exit(1);
  }

  const task = await resolveTask(parsed.id);
  const { updates, events } = computeEditUpdates(task, {
    title: parsed.title,
    description: parsed.description,
    priority: parsed.priority,
    due_date: parsed.dueDate,
    notes: parsed.notes,
  });

  if (events.length === 0) {
    if (parsed.jsonMode) {
      console.log(JSON.stringify({ ...task, note: "no fields changed" }, null, 2));
    } else {
      console.log(`No changes: ${shortId(task.id)} ${task.title}`);
    }
    return;
  }

  const updated = await sbUpdate<Task>("tasks", `id=eq.${task.id}`, updates);

  for (const ev of events) {
    await emitTaskEvent({
      task_id: task.id,
      source: "cli",
      ...ev,
    });
  }

  if (parsed.jsonMode) {
    console.log(JSON.stringify(updated, null, 2));
  } else {
    const fields = events.map((e) => e.event_type.replace("_changed", "").replace("_set", "")).join(", ");
    console.log(`Edited ${shortId(updated.id)}: ${updated.title} (${fields})`);
  }
}
