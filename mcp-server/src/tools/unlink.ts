/**
 * td_unlink — remove all links between two tasks.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  sbDelete,
  findLinksBetween,
  resolveTaskOrThrow,
} from "../_shared/supabase.js";
import { TaskIdSchema } from "../schemas.js";

const InputSchema = {
  source_id: TaskIdSchema.describe("First task (UUID or short prefix)."),
  target_id: TaskIdSchema.describe("Second task (UUID or short prefix)."),
};

export function registerUnlinkTool(server: McpServer): void {
  server.registerTool(
    "td_unlink",
    {
      title: "Unlink two tasks",
      description:
        `Remove all links (in either direction) between two tasks. Errors if no link exists.\n\n` +
        `Returns: { unlinked: number } — the number of links removed.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const [taskA, taskB] = await Promise.all([
        resolveTaskOrThrow(args.source_id),
        resolveTaskOrThrow(args.target_id),
      ]);

      const existing = await findLinksBetween(taskA.id, taskB.id);
      if (existing.length === 0) {
        throw new Error(`No link between ${taskA.id.slice(0, 8)} and ${taskB.id.slice(0, 8)}`);
      }

      await Promise.all(
        existing.map((link) =>
          sbDelete("task_links", `source_id=eq.${link.source_id}&target_id=eq.${link.target_id}`),
        ),
      );

      const output = { unlinked: existing.length };
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );
}
