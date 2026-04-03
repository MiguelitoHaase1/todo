/**
 * Task capture guardrail: one inbound message = one task by default.
 *
 * Multi-task signals are explicit only:
 *   - "add two tasks:", "add 3 tasks:", "add tasks:" (keyword prefix)
 *   - "three things:", "two things:" (word-number prefix)
 *   - Numbered list: lines starting with "1.", "2.", …
 *
 * Everything else — including "X and Y", "do X before Y", "X then Y" —
 * defaults to a single task. When in doubt, capture one.
 *
 * Returns the detected task count (1 for single, N for explicit multi).
 * The caller decides how to split; this function only signals intent.
 */

const WORD_TO_NUMBER: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export function detectTaskCount(message: string): number {
  const lower = message.toLowerCase().trim();

  // Numbered list: count lines that start with a digit followed by "." or ")"
  const numberedLines = message
    .split("\n")
    .filter((line) => /^\s*\d+[.)]\s+\S/.test(line));
  if (numberedLines.length >= 2) {
    return numberedLines.length;
  }

  // "add N tasks:" or "add tasks:" — explicit capture prefix
  const addTasksMatch = lower.match(/^add\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+tasks?[:\s]/);
  if (addTasksMatch) {
    const raw = addTasksMatch[1];
    const n = parseInt(raw, 10);
    if (!isNaN(n)) return n;
    return WORD_TO_NUMBER[raw] ?? 2;
  }

  // "add tasks:" with no number — count comma-separated items
  const addTasksNoNum = lower.match(/^add\s+tasks?[:\s]/);
  if (addTasksNoNum) {
    const rest = message.slice(message.indexOf(":") + 1).trim();
    const items = rest.split(",").map((s) => s.trim()).filter(Boolean);
    return Math.max(items.length, 2);
  }

  // "two things:", "three things:" — word-number prefix
  const thingsMatch = lower.match(/^(two|three|four|five|six|seven|eight|nine|ten)\s+things?[:\s]/);
  if (thingsMatch) {
    return WORD_TO_NUMBER[thingsMatch[1]] ?? 2;
  }

  return 1;
}
