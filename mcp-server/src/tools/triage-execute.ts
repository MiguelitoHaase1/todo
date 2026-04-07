/**
 * td_triage_execute — apply triage actions parsed from a natural reply.
 *
 * Mutation. Reply format: "drop 1 3, defer 2, keep 4" (or "drop all", "keep all").
 * Indices reference the items returned by the most recent td_triage_list call.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  buildTriageList,
  parseTriageReply,
  executeTriageActions,
} from "../_shared/triage.js";
import { toolResult } from "../util/result.js";

const InputSchema = {
  reply: z
    .string()
    .min(1)
    .describe(
      'Triage reply, e.g. "drop 1 3, defer 2, keep 4". Indices reference the most recent td_triage_list result. Also accepts "drop all" / "keep all".',
    ),
};

export function registerTriageExecuteTool(server: McpServer): void {
  server.registerTool(
    "td_triage_execute",
    {
      title: "Execute triage actions",
      description:
        `Parse a triage reply like "drop 1, defer 2, keep 3" and apply the actions to the current triage list.\n\n` +
        `IMPORTANT: this re-builds the triage list internally — call right after td_triage_list and use indices from that response. Don't use stale indices from earlier sessions.\n\n` +
        `Returns: { summary, actions, items_count }.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      const items = await buildTriageList();
      if (items.length === 0) {
        return toolResult({ summary: "Nothing to triage.", actions: [], items_count: 0 });
      }
      const actions = parseTriageReply(args.reply, items.length);
      if (actions.length === 0) {
        throw new Error(`Could not parse triage reply: "${args.reply}". Expected format like "drop 1, defer 2, keep 3" or "drop all".`);
      }
      const summary = await executeTriageActions(items, actions, "mcp");
      return toolResult({ summary, actions, items_count: items.length });
    },
  );
}
