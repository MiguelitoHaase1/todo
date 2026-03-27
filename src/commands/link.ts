import { sbInsert, findLinksBetween, resolveTask, type TaskLink, type LinkType } from "../supabase.ts";
import { shortId } from "../format.ts";

export async function cmdLink(args: string[]): Promise<void> {
  const jsonMode = args.includes("--json");
  const filtered = args.filter((a) => !a.startsWith("--"));

  if (filtered.length < 2) {
    console.error("Usage: td link <task-a> <task-b> [--type=related|parent]");
    process.exit(1);
  }

  const validTypes: LinkType[] = ["related", "parent"];
  let linkType: LinkType = "related";
  const typeArg = args.find((a) => a.startsWith("--type="));
  if (typeArg) {
    const val = typeArg.split("=")[1] as LinkType;
    if (!validTypes.includes(val)) {
      console.error('Link type must be "related" or "parent".');
      process.exit(1);
    }
    linkType = val;
  }

  const [taskA, taskB] = await Promise.all([
    resolveTask(filtered[0]),
    resolveTask(filtered[1]),
  ]);

  const existing = await findLinksBetween(taskA.id, taskB.id);

  if (existing.length > 0) {
    console.error(`Link already exists between ${shortId(taskA.id)} and ${shortId(taskB.id)}.`);
    process.exit(1);
  }

  const link = await sbInsert<TaskLink>("task_links", {
    source_id: taskA.id,
    target_id: taskB.id,
    link_type: linkType,
  });

  if (jsonMode) {
    console.log(JSON.stringify(link, null, 2));
  } else {
    const arrow = linkType === "parent" ? "→ parent of" : "↔ related";
    console.log(`Linked: ${shortId(taskA.id)} ${arrow} ${shortId(taskB.id)}`);
  }
}
