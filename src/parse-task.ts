/**
 * Parse natural-language task input from iMessage.
 *
 * Supported formats:
 *   "Buy milk p2"
 *   "Call dentist 2026-04-01 p1"
 *   "Fix the roof p0 2026-05-15"
 *   "Just a task with no metadata"
 */

export interface ParsedTask {
  title: string;
  priority: number;
  dueDate: string | null;
}

const PRIORITY_RE = /\bp([0-4])\b/i;
const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

export function parseTaskMessage(text: string): ParsedTask {
  let title = text.trim();
  let priority = 3; // Default P3
  let dueDate: string | null = null;

  // Extract priority
  const pMatch = title.match(PRIORITY_RE);
  if (pMatch) {
    priority = parseInt(pMatch[1], 10);
    title = title.replace(PRIORITY_RE, "").trim();
  }

  // Extract date
  const dMatch = title.match(DATE_RE);
  if (dMatch) {
    dueDate = dMatch[1];
    title = title.replace(DATE_RE, "").trim();
  }

  // Clean up extra whitespace
  title = title.replace(/\s+/g, " ").trim();

  return { title, priority, dueDate };
}
