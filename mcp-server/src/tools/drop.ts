/**
 * td_drop — soft-delete a task by flipping status to 'dropped'.
 *
 * Mirrors td_done's shape. Idempotent: dropping an already-dropped task
 * returns it unchanged with a note and emits no event.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  resolveTaskOrThrow,
  sbUpdate,
  emitTaskEvent,
  type Task,
  type TaskEvent,
} from "../_shared/supabase.js";
import { TaskIdSchema } from "../schemas.js";
import { toolResult } from "../util/result.js";

export interface DropTransition {
  alreadyDropped: boolean;
  event: TaskEvent | null;
}

/**
 * Pure helper — what the drop would do for a given task, exposed for unit tests.
 * The handler calls sbUpdate + emitTaskEvent using the event payload returned
 * here; unit tests exercise this function directly.
 */
export function computeDropTransition(task: Task): DropTransition {
  if (task.status === "dropped") {
    return { alreadyDropped: true, event: null };
  }
  return {
    alreadyDropped: false,
    event: {
      task_id: task.id,
      event_type: "status_changed",
      previous_value: task.status,
      new_value: "dropped",
      source: "mcp",
    },
  };
}

const InputSchema = {
  id: TaskIdSchema,
};

export function registerDropTool(server: McpServer): void {
  server.registerTool(
    "td_drop",
    {
      title: "Drop a task",
      description:
        `Soft-delete a task by flipping status to 'dropped'. Distinct from ` +
        `td_done (completed) — dropped means the user chose not to do it.\n\n` +
        `Args:\n` +
        `  - id (required): task UUID or unique short prefix\n\n` +
        `Returns: the updated Task. If already dropped, returns it unchanged with a note.`,
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
      const transition = computeDropTransition(task);

      if (transition.alreadyDropped) {
        return toolResult({ ...task, note: "already dropped — no change" });
      }

      const updated = await sbUpdate<Task>("tasks", `id=eq.${task.id}`, { status: "dropped" });
      if (transition.event) {
        await emitTaskEvent(transition.event);
      }
      return toolResult(updated);
    },
  );
}
