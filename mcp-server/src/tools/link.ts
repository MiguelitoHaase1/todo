/**
 * td_link — create a link between two tasks (related or parent).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  sbInsert,
  findLinksBetween,
  resolveTaskOrThrow,
  type TaskLink,
  type LinkType,
} from "../_shared/supabase.js";
import { TaskIdSchema } from "../schemas.js";

const InputSchema = {
  source_id: TaskIdSchema.describe("First task (UUID or short prefix)."),
  target_id: TaskIdSchema.describe("Second task (UUID or short prefix)."),
  link_type: z
    .enum(["related", "parent"])
    .default("related")
    .optional()
    .describe(
      'Link type. "related" is symmetric (a ↔ b). "parent" is directional (source → parent of target).',
    ),
};

export function registerLinkTool(server: McpServer): void {
  server.registerTool(
    "td_link",
    {
      title: "Link two tasks",
      description:
        `Link two tasks. "related" creates a symmetric reference; "parent" creates a directional one.\n\n` +
        `Errors if a link already exists between the two tasks.\n\n` +
        `Returns: { source_id, target_id, link_type, created_at }.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const linkType: LinkType = args.link_type ?? "related";
      const [taskA, taskB] = await Promise.all([
        resolveTaskOrThrow(args.source_id),
        resolveTaskOrThrow(args.target_id),
      ]);

      const existing = await findLinksBetween(taskA.id, taskB.id);
      if (existing.length > 0) {
        throw new Error(`Link already exists between ${taskA.id.slice(0, 8)} and ${taskB.id.slice(0, 8)}`);
      }

      const link = await sbInsert<TaskLink>("task_links", {
        source_id: taskA.id,
        target_id: taskB.id,
        link_type: linkType,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(link) }],
        structuredContent: link as unknown as Record<string, unknown>,
      };
    },
  );
}
