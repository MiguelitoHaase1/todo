/**
 * td_plan_tomorrow_context — fetch data for planning tomorrow.
 *
 * Returns:
 *   - today_recap: how today went (done / deferred / dropped)
 *   - tomorrow_tasks: tasks already scheduled for tomorrow
 *   - backlog: open tasks with no due date or due > tomorrow, top by priority
 *   - escalations: deferral escalation candidates among tomorrow's tasks
 *   - batches: link-detected groupings among tomorrow's tasks
 *
 * The calling LLM combines this with calendar data and shapes tomorrow's plan
 * via conversation.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sbSelect, type Task } from "../_shared/supabase.js";
import { filterEscalationCandidates, escalationMessage } from "../_shared/deferral.js";
import { detectLinkBatches, formatBatchSuggestion, type BatchGroup } from "../_shared/batch.js";
import { IsoDateSchema } from "../schemas.js";

const InputSchema = {
  date: IsoDateSchema.optional().describe('Tomorrow\'s date in YYYY-MM-DD. Defaults to "today + 1".'),
  backlog_limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional()
    .describe("Max number of backlog tasks to return (default 20)."),
};

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  return isoDate(new Date());
}

function tomorrowIsoFromToday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDate(d);
}

interface PlanTomorrowContext {
  today: string;
  tomorrow: string;
  today_recap: {
    done: Task[];
    deferred: Task[];
    dropped: Task[];
    still_open_today: Task[];
  };
  tomorrow_tasks: Task[];
  backlog: Task[];
  escalations: Array<{ task_id: string; title: string; deferral_count: number; prompt: string }>;
  batches: Array<BatchGroup & { suggestion: string }>;
}

export function registerPlanTomorrowContextTool(server: McpServer): void {
  server.registerTool(
    "td_plan_tomorrow_context",
    {
      title: "Plan tomorrow context",
      description:
        `Gather all todolist data needed to plan tomorrow: today's recap (done/deferred/dropped/still-open), tomorrow's already-scheduled tasks, top backlog by priority, deferral escalations, and detected batch groups.\n\n` +
        `This is a DATA tool, not a planning tool. Use the returned data with calendar information to shape tomorrow's plan via conversation with the user.\n\n` +
        `Args:\n  - date (optional YYYY-MM-DD): tomorrow's date. Defaults to today + 1.\n  - backlog_limit (optional 1-100): max backlog items. Default 20.\n\n` +
        `Returns: { today, tomorrow, today_recap, tomorrow_tasks, backlog, escalations, batches }.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const today = todayIso();
      const tomorrow = args.date ?? tomorrowIsoFromToday();
      const backlogLimit = args.backlog_limit ?? 20;

      const [todayDone, todayDropped, todayStillOpen, tomorrowTasks, backlog, allLinks] = await Promise.all([
        sbSelect<Task>("tasks", `status=eq.done&due_date=eq.${today}`, "priority.asc"),
        sbSelect<Task>("tasks", `status=eq.dropped&due_date=eq.${today}`, "priority.asc"),
        sbSelect<Task>("tasks", `status=eq.open&due_date=eq.${today}`, "priority.asc"),
        sbSelect<Task>("tasks", `status=eq.open&due_date=eq.${tomorrow}`, "priority.asc"),
        sbSelect<Task>(
          "tasks",
          `status=eq.open&or=(due_date.is.null,due_date.gt.${tomorrow})&limit=${backlogLimit}`,
          "priority.asc,due_date.asc.nullslast",
        ),
        sbSelect<{ source_id: string; target_id: string }>("task_links"),
      ]);

      // Heuristic for "deferred today": tasks updated today with non-today due_date
      // are likely deferrals. The deferral_count is the strict signal.
      const deferred = todayStillOpen.filter((t) => (t.deferral_count ?? 0) > 0);

      const tasksForBatch = tomorrowTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
      }));
      const linkBatches = detectLinkBatches(tasksForBatch, allLinks);
      const batches = linkBatches.map((b) => ({ ...b, suggestion: formatBatchSuggestion(b) }));

      const escalationCandidates = filterEscalationCandidates(tomorrowTasks);
      const escalations = escalationCandidates.map((t) => ({
        task_id: t.id,
        title: t.title,
        deferral_count: t.deferral_count ?? 0,
        prompt: escalationMessage(t),
      }));

      const output: PlanTomorrowContext = {
        today,
        tomorrow,
        today_recap: {
          done: todayDone,
          deferred,
          dropped: todayDropped,
          still_open_today: todayStillOpen,
        },
        tomorrow_tasks: tomorrowTasks,
        backlog,
        escalations,
        batches,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output as unknown as Record<string, unknown>,
      };
    },
  );
}
