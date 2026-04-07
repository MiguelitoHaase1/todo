/**
 * td_morning_context — fetch all todolist data needed for the morning briefing.
 *
 * This is a DATA tool, not a planning tool. The calling LLM (in claude.ai chat
 * or Claude Code) takes this data + calendar events from the gcal MCP and
 * produces the actual day plan. The morning skill in /todo handles the
 * conversational adjustment loop separately.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sbSelect, type Task } from "../_shared/supabase.js";
import { todayIso } from "../_shared/format.js";
import { IsoDateSchema } from "../schemas.js";
import { toolResult } from "../util/result.js";
import { buildEscalationItems, buildLinkBatches } from "../util/context-helpers.js";

const InputSchema = {
  date: IsoDateSchema.optional().describe("Target date in YYYY-MM-DD. Defaults to today."),
};

export function registerMorningContextTool(server: McpServer): void {
  server.registerTool(
    "td_morning_context",
    {
      title: "Morning briefing context",
      description:
        `Gather all todolist data needed to plan today: tasks due today, overdue items, deferral escalations (tasks deferred 2+ times), and detected batch groups (linked tasks at the same priority tier).\n\n` +
        `This is a DATA tool — it doesn't plan the day. Use the returned data plus calendar events (from a separate calendar tool) to shape the actual plan and ask the user about it.\n\n` +
        `Args:\n  - date (optional YYYY-MM-DD): defaults to today.\n\n` +
        `Returns: { date, today_tasks, overdue_tasks, escalations, batches }.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const date = args.date ?? todayIso();

      const [todayTasks, overdueTasks] = await Promise.all([
        sbSelect<Task>("tasks", `status=eq.open&due_date=eq.${date}`, "priority.asc"),
        sbSelect<Task>("tasks", `status=eq.open&due_date=lt.${date}`, "priority.asc,due_date.asc"),
      ]);

      const allTasks = [...todayTasks, ...overdueTasks];
      const batches = await buildLinkBatches(allTasks);
      const escalations = buildEscalationItems(todayTasks);

      return toolResult({
        date,
        today_tasks: todayTasks,
        overdue_tasks: overdueTasks,
        escalations,
        batches,
      });
    },
  );
}
