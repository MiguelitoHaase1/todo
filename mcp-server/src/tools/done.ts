/**
 * td_done — mark a task as done by id (UUID or short prefix).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveTaskOrThrow, sbUpdate, emitTaskEvent, type Task } from "../_shared/supabase.js";
import { TaskIdSchema } from "../schemas.js";

const InputSchema = {
  id: TaskIdSchema,
};

export function registerDoneTool(server: McpServer): void {
  server.registerTool(
    "td_done",
    {
      title: "Mark a task done",
      description:
        `Mark a todolist task as done. Accepts a full UUID or short prefix.\n\n` +
        `Args:\n` +
        `  - id (required): task UUID or unique short prefix\n\n` +
        `Returns: the updated Task. If the task was already done, returns it unchanged with a note.`,
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

      if (task.status === "done") {
        const output = { ...task, note: "already done — no change" };
        return {
          content: [{ type: "text", text: JSON.stringify(output) }],
          structuredContent: output as unknown as Record<string, unknown>,
        };
      }

      const updated = await sbUpdate<Task>("tasks", `id=eq.${task.id}`, { status: "done" });

      await emitTaskEvent({
        task_id: task.id,
        event_type: "status_changed",
        previous_value: task.status,
        new_value: "done",
        source: "mcp",
      });

      return {
        content: [{ type: "text", text: JSON.stringify(updated) }],
        structuredContent: updated as unknown as Record<string, unknown>,
      };
    },
  );
}
