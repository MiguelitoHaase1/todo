/**
 * td_add — create a new task. Mutates Supabase, emits a created event.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sbInsert, emitTaskEvent, type Task } from "../_shared/supabase.js";
import { PrioritySchema, IsoDateSchema } from "../schemas.js";
import { toolResult } from "../util/result.js";

const InputSchema = {
  title: z.string().min(1).max(500).describe("Task title."),
  description: z.string().max(20000).optional().describe("Optional longer description (markdown supported; up to 20000 chars)."),
  priority: PrioritySchema.default(3).optional(),
  due_date: IsoDateSchema.optional().describe("Optional due date in YYYY-MM-DD."),
};

export function registerAddTool(server: McpServer): void {
  server.registerTool(
    "td_add",
    {
      title: "Add a todolist task",
      description:
        `Create a new task in the todolist. Mirrors the CLI's \`td add\`.\n\n` +
        `Args:\n` +
        `  - title (required string): the task title\n` +
        `  - description (optional string): longer description\n` +
        `  - priority (optional 0-4, default 3): 0=critical, 3=default, 4=backlog\n` +
        `  - due_date (optional YYYY-MM-DD): due date\n\n` +
        `Returns: the created Task with id, title, priority, status, due_date, created_at.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      const priority = args.priority ?? 3;
      const task = await sbInsert<Task>("tasks", {
        title: args.title,
        description: args.description ?? null,
        priority,
        due_date: args.due_date ?? null,
        status: "open",
      });

      await emitTaskEvent({
        task_id: task.id,
        event_type: "created",
        new_value: `P${priority}${args.due_date ? ` due ${args.due_date}` : ""}`,
        source: "mcp",
      });

      return toolResult(task);
    },
  );
}
