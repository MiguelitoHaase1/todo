/**
 * td_triage_list — surface tasks needing attention (overdue / due tomorrow / stale).
 *
 * Read-only. Returns numbered items so the LLM can ask the user which to drop/defer/keep,
 * then call `td_triage_execute` with a parsed reply.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildTriageList } from "../_shared/triage.js";
import { toolResult } from "../util/result.js";

export function registerTriageListTool(server: McpServer): void {
  server.registerTool(
    "td_triage_list",
    {
      title: "List triage candidates",
      description:
        `Build the triage list — open tasks that are overdue, due tomorrow, or stale (P3/P4 with no due date and no recent updates).\n\n` +
        `Use this to surface what needs the user's attention. Items are numbered 1..N so the user can reply "drop 1, defer 3, keep 2" — pass that reply to td_triage_execute.\n\n` +
        `No arguments. Returns: { count, items: [{ index, task, reason }] } where reason is "overdue" | "due tomorrow" | "stale, no date".`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const items = await buildTriageList();
      return toolResult({ count: items.length, items });
    },
  );
}
