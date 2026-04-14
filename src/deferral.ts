/**
 * Deferral escalation — smart deferral suggestions.
 *
 * When a task hits 2+ deferrals, the morning flow surfaces "drop or promote?"
 * instead of silently re-deferring.
 *
 * At 3+ deferrals, the force-decision flag is set. The deferred card in the
 * Morning Brew renders a red "force decision" badge — the task must be
 * pulled into today or dropped. No more silent re-deferrals.
 */

/** Minimum deferrals before escalation prompt. */
const ESCALATION_THRESHOLD = 2;

/**
 * Minimum deferrals to surface a force-decision flag.
 *
 * At this count, the morning brew renders a visible "force decision" badge
 * on the deferred card. The user sees the task has been kicked down the
 * road N times and must act: promote it to today or drop it.
 *
 * Threshold is 3 — one more than escalation — so the UI escalates twice:
 * first with the "drop or promote?" prompt at 2, then with a hard-flagged
 * badge at 3.
 */
const FORCE_DECISION_THRESHOLD = 3;

type MinimalTask = {
  id: string;
  title: string;
  deferral_count?: number;
};

/** True when the task has been deferred enough times to warrant escalation. */
export function shouldEscalateDeferral(task: MinimalTask): boolean {
  return (task.deferral_count ?? 0) >= ESCALATION_THRESHOLD;
}

/**
 * True when the task has been deferred enough times to force a decision.
 *
 * Used by the morning brew renderer to mark a deferred card with a visible
 * flag. Downstream logic can then refuse to re-defer without an explicit
 * drop or promote.
 */
export function shouldForceDecision(task: MinimalTask): boolean {
  return (task.deferral_count ?? 0) >= FORCE_DECISION_THRESHOLD;
}

/** One-line escalation prompt shown in the morning flow. */
export function escalationMessage(task: MinimalTask): string {
  const count = task.deferral_count ?? 0;
  return `Drop or promote? "${task.title}" has been deferred ${count} time${count === 1 ? "" : "s"}.`;
}

/**
 * One-line force-decision message shown in the morning brew.
 *
 * Sharper tone than escalationMessage — at 3+ deferrals we stop asking
 * politely. The user must act.
 */
export function forceDecisionMessage(task: MinimalTask): string {
  const count = task.deferral_count ?? 0;
  return `Force decision: "${task.title}" deferred ${count} times. Pull in or drop.`;
}

/** Supabase PATCH payload when a task is deferred (increments the counter). */
export function markDeferred(task: MinimalTask): { deferral_count: number } {
  return { deferral_count: (task.deferral_count ?? 0) + 1 };
}

/** From a list of tasks, return those that need an escalation prompt. */
export function filterEscalationCandidates<T extends MinimalTask>(tasks: T[]): T[] {
  return tasks.filter(shouldEscalateDeferral);
}

/** From a list of tasks, return those that should force a decision (≥3 deferrals). */
export function filterForceDecisionCandidates<T extends MinimalTask>(tasks: T[]): T[] {
  return tasks.filter(shouldForceDecision);
}
