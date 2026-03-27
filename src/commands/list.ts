import { sbSelect, type Task } from "../supabase.ts";
import { formatTaskRow } from "../format.ts";

export async function cmdList(args: string[]): Promise<void> {
  const jsonMode = args.includes("--json");
  const todayOnly = args.includes("--today");

  // Parse --status flag (default: open)
  let statusFilter = "open";
  const statusIdx = args.indexOf("--status");
  if (statusIdx !== -1 && args[statusIdx + 1]) {
    statusFilter = args[statusIdx + 1];
  }

  // Parse --due <date> flag (YYYY-MM-DD)
  let dueFilter: string | null = null;
  const dueIdx = args.indexOf("--due");
  if (dueIdx !== -1 && args[dueIdx + 1]) {
    dueFilter = args[dueIdx + 1];
  }

  // Build query filters
  const filters: string[] = [];

  if (statusFilter !== "all") {
    filters.push(`status=eq.${statusFilter}`);
  }

  if (todayOnly) {
    const today = new Date().toISOString().slice(0, 10);
    filters.push(`due_date=eq.${today}`);
  } else if (dueFilter) {
    filters.push(`due_date=eq.${dueFilter}`);
  }

  const query = filters.join("&");
  const tasks = await sbSelect<Task>("tasks", query, "priority.asc,due_date.asc.nullslast");

  if (jsonMode) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }

  if (tasks.length === 0) {
    console.log(todayOnly ? "No tasks due today." : "No tasks found.");
    return;
  }

  for (const task of tasks) {
    console.log(formatTaskRow(task));
  }

  console.log(`\n  ${tasks.length} task${tasks.length === 1 ? "" : "s"}`);
}
