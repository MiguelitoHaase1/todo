/**
 * Deferral escalation — smart deferral suggestions.
 *
 * When a task hits 2+ deferrals, the morning flow surfaces "drop or promote?"
 * instead of silently re-deferring.
 */

/** Minimum deferrals before escalation prompt. */
const ESCALATION_THRESHOLD = 2;

type MinimalTask = {
  id: string;
  title: string;
  deferral_count?: number;
};

/** True when the task has been deferred enough times to warrant escalation. */
export function shouldEscalateDeferral(task: MinimalTask): boolean {
  return (task.deferral_count ?? 0) >= ESCALATION_THRESHOLD;
}

/** One-line escalation prompt shown in the morning flow. */
export function escalationMessage(task: MinimalTask): string {
  const count = task.deferral_count ?? 0;
  return `Drop or promote? "${task.title}" has been deferred ${count} time${count === 1 ? "" : "s"}.`;
}

/** Supabase PATCH payload when a task is deferred (increments the counter). */
export function markDeferred(task: MinimalTask): { deferral_count: number } {
  return { deferral_count: (task.deferral_count ?? 0) + 1 };
}

/** From a list of tasks, return those that need an escalation prompt. */
export function filterEscalationCandidates<T extends MinimalTask>(tasks: T[]): T[] {
  return tasks.filter(shouldEscalateDeferral);
}
