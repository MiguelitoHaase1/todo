import { sbInsert, emitTaskEvent, type Task } from "../supabase.ts";
import { formatTaskRow, shortId } from "../format.ts";

export async function cmdAdd(args: string[]): Promise<void> {
  const jsonMode = args.includes("--json");
  const filteredArgs = args.filter((a) => a !== "--json");

  // Parse title (first non-flag argument)
  let title = "";
  let priority = 3; // Default P3
  let dueDate: string | null = null;
  let description: string | null = null;
  // What kind of work this is (hypothesis 8aa4d287) — drives the flash/deep
  // icon on the kanban card. Set here, at write time, by whoever knows the
  // work; never inferred later from the title. null is the normal answer.
  let taskType: string | null = null;

  for (let i = 0; i < filteredArgs.length; i++) {
    const arg = filteredArgs[i];

    if (arg === "-p" || arg === "--priority") {
      const val = filteredArgs[++i];
      const p = parseInt(val, 10);
      if (isNaN(p) || p < 0 || p > 4) {
        console.error(`Invalid priority: ${val} (must be 0-4)`);
        process.exit(1);
      }
      priority = p;
    } else if (arg === "--due") {
      dueDate = filteredArgs[++i];
      if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        console.error(`Invalid due date: ${dueDate} (use YYYY-MM-DD)`);
        process.exit(1);
      }
    } else if (arg === "--type") {
      taskType = filteredArgs[++i];
      if (taskType !== "flash" && taskType !== "deep") {
        console.error(`Invalid type: ${taskType} (use flash or deep)`);
        process.exit(1);
      }
    } else if (arg === "-d" || arg === "--description") {
      description = filteredArgs[++i] ?? "";
      if (description.length > 20000) {
        console.error(`Description too long: ${description.length} chars (max 20000)`);
        process.exit(1);
      }
    } else if (!arg.startsWith("-")) {
      title = arg;
    }
  }

  if (!title) {
    console.error('Usage: td add "task title" [-p 0-4] [--due YYYY-MM-DD] [--type flash|deep] [-d "description"]');
    process.exit(1);
  }

  const task = await sbInsert<Task>("tasks", {
    title,
    description,
    priority,
    due_date: dueDate,
    task_type: taskType,
    status: "open",
  });

  await emitTaskEvent({
    task_id: task.id,
    event_type: "created",
    new_value: `P${priority}${dueDate ? ` due ${dueDate}` : ""}`,
    source: "cli",
  });

  if (jsonMode) {
    console.log(JSON.stringify(task, null, 2));
  } else {
    console.log(`Created ${shortId(task.id)}: ${task.title}`);
  }
}
