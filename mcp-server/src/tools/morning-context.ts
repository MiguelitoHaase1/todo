/**
 * td_morning_context — fetch all todolist data needed for the morning briefing.
 *
 * This is a DATA tool, not a planning tool. The calling LLM (in claude.ai chat
 * or Claude Code) takes this data + calendar events from the gcal MCP and
 * produces the actual day plan. The morning skill in /todo handles the
 * conversational adjustment loop separately.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sbSelect, type Task } from "../_shared/supabase.js";
import { filterEscalationCandidates, escalationMessage } from "../_shared/deferral.js";
import { detectLinkBatches, formatBatchSuggestion, type BatchGroup } from "../_shared/batch.js";
import { IsoDateSchema } from "../schemas.js";

const InputSchema = {
  date: IsoDateSchema.optional().describe("Target date in YYYY-MM-DD. Defaults to today."),
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface EscalationItem {
  task_id: string;
  title: string;
  deferral_count: number;
  prompt: string;
}

interface MorningContext {
  date: string;
  today_tasks: Task[];
  overdue_tasks: Task[];
  escalations: EscalationItem[];
  batches: Array<BatchGroup & { suggestion: string }>;
}

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

      const [todayTasks, overdueTasks, allLinks] = await Promise.all([
        sbSelect<Task>("tasks", `status=eq.open&due_date=eq.${date}`, "priority.asc"),
        sbSelect<Task>("tasks", `status=eq.open&due_date=lt.${date}`, "priority.asc,due_date.asc"),
        sbSelect<{ source_id: string; target_id: string }>("task_links"),
      ]);

      const allTasksForBatch = [...todayTasks, ...overdueTasks].map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
      }));
      const linkBatches = detectLinkBatches(allTasksForBatch, allLinks);
      const batchesWithSuggestions = linkBatches.map((b) => ({
        ...b,
        suggestion: formatBatchSuggestion(b),
      }));

      const escalationCandidates = filterEscalationCandidates(todayTasks);
      const escalations: EscalationItem[] = escalationCandidates.map((t) => ({
        task_id: t.id,
        title: t.title,
        deferral_count: t.deferral_count ?? 0,
        prompt: escalationMessage(t),
      }));

      const output: MorningContext = {
        date,
        today_tasks: todayTasks,
        overdue_tasks: overdueTasks,
        escalations,
        batches: batchesWithSuggestions,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    },
  );
}
