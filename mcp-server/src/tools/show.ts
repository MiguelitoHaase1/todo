/**
 * td_show — fetch a task with its labels and links.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  resolveTaskOrThrow,
  sbSelect,
  linkDirection,
  type Task,
  type TaskLabel,
  type TaskLink,
  type LinkType,
} from "../_shared/supabase.js";
import { TaskIdSchema } from "../schemas.js";

const InputSchema = {
  id: TaskIdSchema,
};

interface LinkedTask {
  id: string;
  title: string;
  linkType: LinkType;
  direction: string;
}

async function getLinkedTasks(taskId: string): Promise<LinkedTask[]> {
  try {
    const links = await sbSelect<TaskLink>(
      "task_links",
      `or=(source_id.eq.${taskId},target_id.eq.${taskId})`,
    );
    if (links.length === 0) return [];

    const otherIds = links.map((l) => (l.source_id === taskId ? l.target_id : l.source_id));
    const tasks = await sbSelect<Task>("tasks", `id=in.(${otherIds.join(",")})`);
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    return links.map((l) => {
      const otherId = l.source_id === taskId ? l.target_id : l.source_id;
      const other = taskMap.get(otherId);
      return {
        id: otherId,
        title: other?.title ?? "(unknown)",
        linkType: l.link_type,
        direction: linkDirection(l, taskId),
      };
    });
  } catch {
    return [];
  }
}

export function registerShowTool(server: McpServer): void {
  server.registerTool(
    "td_show",
    {
      title: "Show task detail",
      description:
        `Get a single task with its labels and links. Accepts UUID or short prefix.\n\n` +
        `Args:\n` +
        `  - id (required): task UUID or unique short prefix\n\n` +
        `Returns: the Task plus { labels: string[], links: { id, title, linkType, direction }[] }.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const task = await resolveTaskOrThrow(args.id);

      const [labelNames, linkedTasks] = await Promise.all([
        sbSelect<TaskLabel>(
          "task_labels",
          `task_id=eq.${task.id}&select=label_id,labels(name,label_type)`,
        )
          .then((tls) =>
            tls
              .map((tl) => (tl.labels ? `${tl.labels.name} (${tl.labels.label_type})` : ""))
              .filter(Boolean),
          )
          .catch(() => [] as string[]),
        getLinkedTasks(task.id),
      ]);

      const output = { ...task, labels: labelNames, links: linkedTasks };
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );
}
