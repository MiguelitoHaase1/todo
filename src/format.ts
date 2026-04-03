/**
 * Shared formatting utilities for tasks.
 */

const PRIORITY_LABELS: Record<number, string> = {
  0: "P0",
  1: "P1",
  2: "P2",
  3: "P3",
  4: "P4",
};

export function priorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority] ?? `P${priority}`;
}

export function formatDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
