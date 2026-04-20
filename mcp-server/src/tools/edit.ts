/**
 * td_edit — update an existing task in place.
 *
 * Args: `id` (required) plus any subset of `title`, `description`, `priority`,
 * `due_date`. Semantics match the hypothesis c0adfd21:
 *   - undefined / missing → leave the field unchanged
 *   - empty string on `description` or `due_date` → clear (set to null)
 *   - any other value → update to the new value
 *
 * One `task_events` row is emitted per changed field (including the new
 * `description_changed` event_type). A no-op edit (nothing to change) emits
 * no events and returns the task with a note.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  resolveTaskOrThrow,
  sbUpdate,
  emitTaskEvent,
  type Task,
  type TaskEvent,
} from "../_shared/supabase.js";
import { PrioritySchema, IsoDateSchema, TaskIdSchema } from "../schemas.js";
import { toolResult } from "../util/result.js";

/**
 * Zod input schema. `description` and `due_date` accept either a non-empty
 * value or the empty string (which clears the field). Priority stays numeric.
 */
const InputSchema = {
  id: TaskIdSchema,
  title: z.string().min(1).max(500).optional().describe("New task title."),
  description: z
    .string()
    .max(2000)
    .optional()
    .describe("New description, or empty string to clear."),
  priority: PrioritySchema.optional(),
  due_date: z
    .union([IsoDateSchema, z.literal("")])
    .optional()
    .describe("New due date YYYY-MM-DD, or empty string to clear."),
};

/** The patch we PATCH to Supabase — only fields that actually changed appear. */
export interface EditUpdates {
  title?: string;
  description?: string | null;
  priority?: number;
  due_date?: string | null;
}

/** An audit event produced by the edit. One entry per changed field. */
export type EditEvent = Omit<TaskEvent, "task_id" | "source">;

/** Args the pure planner accepts. Matches the Zod-parsed shape. */
export interface EditArgs {
  title?: string;
  description?: string;
  priority?: number;
  due_date?: string;
}

/**
 * Pure: compute the Supabase patch + audit events for an edit, given the
 * current task state and the incoming args.
 *
 * Semantics:
 *   - title: any non-empty string replaces the current title (empty string
 *     is rejected by Zod upstream, so we don't handle it here)
 *   - description: empty string clears (sets null); any other string replaces
 *   - priority: number replaces; same value = no-op
 *   - due_date: empty string clears (sets null); ISO date replaces
 *
 * Same-value writes (e.g. passing the current title) are NOT emitted as
 * events — an event implies a real state change.
 */
export function computeEditUpdates(
  task: Task,
  args: EditArgs,
): { updates: EditUpdates; events: EditEvent[] } {
  const updates: EditUpdates = {};
  const events: EditEvent[] = [];

  if (args.title !== undefined && args.title !== task.title) {
    updates.title = args.title;
    events.push({
      event_type: "title_changed",
      previous_value: task.title,
      new_value: args.title,
    });
  }

  if (args.description !== undefined) {
    const next = args.description === "" ? null : args.description;
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

export function registerEditTool(server: McpServer): void {
  server.registerTool(
    "td_edit",
    {
      title: "Edit a todolist task",
      description:
        `Update an existing task in place. Mirrors the CLI's \`td edit\`.\n\n` +
        `Args:\n` +
        `  - id (required): task UUID or unique short prefix\n` +
        `  - title (optional string): new title\n` +
        `  - description (optional string): new description, or empty string to clear\n` +
        `  - priority (optional 0-4): new priority\n` +
        `  - due_date (optional YYYY-MM-DD or empty string): new due date, or empty string to clear\n\n` +
        `Undefined fields are left unchanged. One task_events row is emitted per changed field.\n\n` +
        `Returns: the updated Task.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const task = await resolveTaskOrThrow(args.id);
      const { updates, events } = computeEditUpdates(task, {
        title: args.title,
        description: args.description,
        priority: args.priority,
        due_date: args.due_date,
      });

      if (events.length === 0) {
        return toolResult({ ...task, note: "no fields changed — no-op" });
      }

      const updated = await sbUpdate<Task>(
        "tasks",
        `id=eq.${task.id}`,
        updates as Record<string, unknown>,
      );

      for (const ev of events) {
        await emitTaskEvent({
          task_id: task.id,
          source: "mcp",
          ...ev,
        });
      }

      return toolResult(updated);
    },
  );
}
