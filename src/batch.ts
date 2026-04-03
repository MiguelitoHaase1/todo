/**
 * Auto-batch related tasks — detect same-tier tasks sharing a label or link.
 *
 * Used in the morning flow's plan-shaping step to suggest back-to-back scheduling.
 * Only batches within the same priority tier (P0 with P0, P1 with P1, etc.).
 */

export interface BatchGroup {
  taskIds: string[];
  taskTitles: string[];
  sharedContext: string;
  /** Supabase priority (0=critical … 4=backlog). All tasks in the group share this. */
  priority: number;
}

type MinTask = { id: string; title: string; priority: number };
type TaskLabelRow = { task_id: string; label_name: string };
type TaskLinkRow = { source_id: string; target_id: string };

/** Find groups of today's tasks that share a label, within the same priority tier. */
export function detectLabelBatches(
  tasks: MinTask[],
  labelRows: TaskLabelRow[],
): BatchGroup[] {
  // Index tasks by id
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Group task IDs by label name
  const byLabel = new Map<string, string[]>();
  for (const row of labelRows) {
    if (!taskMap.has(row.task_id)) continue; // not in today's tasks
    const ids = byLabel.get(row.label_name) ?? [];
    ids.push(row.task_id);
    byLabel.set(row.label_name, ids);
  }

  const groups: BatchGroup[] = [];
  for (const [label, ids] of byLabel) {
    if (ids.length < 2) continue;

    // Split by priority tier — only batch same-priority tasks
    const byPriority = new Map<number, string[]>();
    for (const id of ids) {
      const task = taskMap.get(id)!;
      const tier = byPriority.get(task.priority) ?? [];
      tier.push(id);
      byPriority.set(task.priority, tier);
    }

    for (const [priority, tierIds] of byPriority) {
      if (tierIds.length < 2) continue;
      groups.push({
        taskIds: tierIds,
        taskTitles: tierIds.map((id) => taskMap.get(id)!.title),
        sharedContext: label,
        priority,
      });
    }
  }

  return groups;
}

/** Find pairs of today's tasks that are directly linked, within the same priority tier. */
export function detectLinkBatches(
  tasks: MinTask[],
  links: TaskLinkRow[],
): BatchGroup[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const groups: BatchGroup[] = [];

  for (const link of links) {
    const a = taskMap.get(link.source_id);
    const b = taskMap.get(link.target_id);
    if (!a || !b) continue; // one or both not in today's tasks
    if (a.priority !== b.priority) continue; // different priority tiers

    groups.push({
      taskIds: [a.id, b.id],
      taskTitles: [a.title, b.title],
      sharedContext: "linked",
      priority: a.priority,
    });
  }

  return groups;
}

/** Format a batch group as a one-line suggestion for the morning flow. */
export function formatBatchSuggestion(group: BatchGroup): string {
  const titles = group.taskTitles.map((t) => `"${t}"`).join(" and ");
  return `Schedule back-to-back (both relate to "${group.sharedContext}"): ${titles}`;
}
