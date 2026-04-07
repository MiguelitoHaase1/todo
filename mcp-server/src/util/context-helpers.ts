/**
 * Shared helpers for the morning_context and plan_tomorrow_context tools.
 *
 * Both tools build the same shapes from the same primitives (deferral
 * escalation candidates, link-detected batches), so the mapping logic and
 * the EscalationItem type live here.
 */

import { sbSelect, type Task } from "../_shared/supabase.js";
import { filterEscalationCandidates, escalationMessage } from "../_shared/deferral.js";
import { detectLinkBatches, formatBatchSuggestion, type BatchGroup } from "../_shared/batch.js";

export interface EscalationItem {
  task_id: string;
  title: string;
  deferral_count: number;
  prompt: string;
}

export type BatchSuggestion = BatchGroup & { suggestion: string };

export function buildEscalationItems(tasks: Task[]): EscalationItem[] {
  return filterEscalationCandidates(tasks).map((t) => ({
    task_id: t.id,
    title: t.title,
    deferral_count: t.deferral_count ?? 0,
    prompt: escalationMessage(t),
  }));
}

/**
 * Detect link-based batches across the given tasks. Loads only the links
 * that touch those tasks (avoids fetching the entire task_links table).
 */
export async function buildLinkBatches(tasks: Task[]): Promise<BatchSuggestion[]> {
  if (tasks.length === 0) return [];
  const ids = tasks.map((t) => t.id).join(",");
  const links = await sbSelect<{ source_id: string; target_id: string }>(
    "task_links",
    `or=(source_id.in.(${ids}),target_id.in.(${ids}))`,
  );
  const minTasks = tasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority }));
  return detectLinkBatches(minTasks, links).map((b) => ({
    ...b,
    suggestion: formatBatchSuggestion(b),
  }));
}
