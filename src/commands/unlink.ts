import { sbDelete, findLinksBetween, resolveTask } from "../supabase.ts";
import { shortId } from "../format.ts";

export async function cmdUnlink(args: string[]): Promise<void> {
  const filtered = args.filter((a) => !a.startsWith("--"));

  if (filtered.length < 2) {
    console.error("Usage: td unlink <task-a> <task-b>");
    process.exit(1);
  }

  const [taskA, taskB] = await Promise.all([
    resolveTask(filtered[0]),
    resolveTask(filtered[1]),
  ]);

  const existing = await findLinksBetween(taskA.id, taskB.id);

  if (existing.length === 0) {
    console.error(`No link between ${shortId(taskA.id)} and ${shortId(taskB.id)}.`);
    process.exit(1);
  }

  await Promise.all(
    existing.map((link) =>
      sbDelete("task_links", `source_id=eq.${link.source_id}&target_id=eq.${link.target_id}`),
    ),
  );

  console.log(`Unlinked: ${shortId(taskA.id)} ↔ ${shortId(taskB.id)}`);
}
