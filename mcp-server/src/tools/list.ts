/**
 * td_list — list tasks with optional filters.
 *
 * Mirrors the CLI's `td list` command. Read-only.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sbSelect, type Task } from "../_shared/supabase.js";
import { StatusFilterSchema, IsoDateSchema } from "../schemas.js";

const InputSchema = {
  status: StatusFilterSchema.default("open").optional(),
  today: z
    .boolean()
    .optional()
    .describe("If true, return only tasks with due_date == today (overrides due_date)."),
  due_date: IsoDateSchema.optional().describe("Filter to tasks with this exact due_date."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .optional()
    .describe("Maximum number of tasks to return (default 50, max 200)."),
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function registerListTool(server: McpServer): void {
  server.registerTool(
    "td_list",
    {
      title: "List todolist tasks",
      description:
        `List tasks from the todolist. Defaults to open tasks ordered by priority then due_date.\n\n` +
        `Use this to answer questions like "what's on my plate", "what's due today", "what dropped tasks did I have last week", etc.\n\n` +
        `Args:\n` +
        `  - status (optional): "open" | "done" | "dropped" | "all". Default "open".\n` +
        `  - today (optional boolean): if true, only tasks due today.\n` +
        `  - due_date (optional YYYY-MM-DD): only tasks with this exact due_date.\n` +
        `  - limit (optional 1-200): max number of tasks. Default 50.\n\n` +
        `Returns: { count, tasks: Task[] } where Task has id, title, description, priority (0-4), status, due_date, deferral_count, created_at, updated_at.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const status = args.status ?? "open";
      const limit = args.limit ?? 50;
      const today = args.today ?? false;
      const dueDate = today ? todayIso() : args.due_date;

      const filters: string[] = [];
      if (status !== "all") filters.push(`status=eq.${status}`);
      if (dueDate) filters.push(`due_date=eq.${dueDate}`);
      filters.push(`limit=${limit}`);

      const tasks = await sbSelect<Task>(
        "tasks",
        filters.join("&"),
        "priority.asc,due_date.asc.nullslast",
      );

      const output = { count: tasks.length, tasks };
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );
}
