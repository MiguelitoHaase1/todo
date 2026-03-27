import { resolveTask, sbSelect, type Task, type TaskLabel, type TaskLink } from "../supabase.ts";
import { formatTaskDetail, shortId } from "../format.ts";

interface LinkedTask {
  id: string;
  title: string;
  linkType: string;
  direction: string; // "→" for outgoing, "←" for incoming
}

async function getLinkedTasks(taskId: string): Promise<LinkedTask[]> {
  try {
    const links = await sbSelect<TaskLink>(
      "task_links",
      `or=(source_id.eq.${taskId},target_id.eq.${taskId})`,
    );
    if (links.length === 0) return [];

    const otherIds = links.map((l) => l.source_id === taskId ? l.target_id : l.source_id);
    const tasks = await sbSelect<Task>(
      "tasks",
      `id=in.(${otherIds.join(",")})`,
    );
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    return links.map((l) => {
      const isSource = l.source_id === taskId;
      const otherId = isSource ? l.target_id : l.source_id;
      const other = taskMap.get(otherId);
      return {
        id: otherId,
        title: other?.title ?? "(unknown)",
        linkType: l.link_type,
        direction: l.link_type === "parent" ? (isSource ? "→ parent of" : "← child of") : "↔ related",
      };
    });
  } catch {
    return [];
  }
}

export async function cmdShow(args: string[]): Promise<void> {
  const jsonMode = args.includes("--json");
  const id = args.find((a) => !a.startsWith("-"));

  if (!id) {
    console.error("Usage: td show <id>");
    process.exit(1);
  }

  const task = await resolveTask(id);

  const [labelNames, linkedTasks] = await Promise.all([
    sbSelect<TaskLabel>(
      "task_labels",
      `task_id=eq.${task.id}&select=label_id,labels(name,label_type)`,
    )
      .then((tls) =>
        tls.map((tl) => tl.labels ? `${tl.labels.name} (${tl.labels.label_type})` : "").filter(Boolean),
      )
      .catch(() => [] as string[]),
    getLinkedTasks(task.id),
  ]);

  if (jsonMode) {
    console.log(JSON.stringify({ ...task, labels: labelNames, links: linkedTasks }, null, 2));
  } else {
    let output = formatTaskDetail(task, labelNames);
    if (linkedTasks.length > 0) {
      output += "\n\n  Links:";
      for (const lt of linkedTasks) {
        output += `\n    ${shortId(lt.id)}  ${lt.direction}  ${lt.title}`;
      }
    }
    console.log(output);
  }
}
