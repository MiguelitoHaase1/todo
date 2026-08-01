import { resolveTask, sbUpdate, emitTaskEvent, type Task } from "../supabase.ts";
import { shortId } from "../format.ts";

export async function cmdDone(args: string[]): Promise<void> {
  const jsonMode = args.includes("--json");
  const id = args.find((a) => !a.startsWith("-"));

  if (!id) {
    console.error("Usage: td done <id>");
    process.exit(1);
  }

  const task = await resolveTask(id);

  if (task.status === "done") {
    console.log(`Already done: ${shortId(task.id)} ${task.title}`);
    return;
  }

  const updated = await sbUpdate<Task>("tasks", `id=eq.${task.id}`, {
    status: "done",
  });

  await emitTaskEvent({
    task_id: task.id,
    event_type: "status_changed",
    previous_value: task.status,
    new_value: "done",
    source: "cli",
  });

  if (jsonMode) {
    console.log(JSON.stringify(updated, null, 2));
  } else {
    console.log(`Done: ${shortId(updated.id)} ${updated.title}`);
  }
}
