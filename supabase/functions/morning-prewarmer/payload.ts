// Pure assembly of the morning snapshot, kept apart from I/O so it can be tested.

export type SnapshotTask = { id: string; title: string; priority: number; due_date: string | null };

export type SnapshotInput = {
  date: string;
  yesterday: { date: string; summary: string | null } | null;
  anchorGoal: string | null;
  overdue: SnapshotTask[];
  dueToday: SnapshotTask[];
  p0p1: SnapshotTask[];
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function buildPayload(input: SnapshotInput) {
  const headsup: string[] = [
    // No server-side calendar route yet; see the note at the top of index.ts.
    "Calendar not connected, so meetings are not listed.",
  ];
  const n = input.overdue.length;
  if (n) headsup.push(`${plural(n, "overdue task")} ${n === 1 ? "needs" : "need"} triage.`);
  if (input.dueToday.length) headsup.push(`${plural(input.dueToday.length, "task")} due today.`);
  if (!input.overdue.length && !input.dueToday.length) headsup.push("Nothing due today.");

  return {
    date: input.date,
    anchor_goal: input.anchorGoal,
    yesterday: input.yesterday,
    calendar_connected: false,
    schedule: [],
    tasks: { p0_p1: input.p0p1, due_today: input.dueToday, overdue: input.overdue },
    headsup,
  };
}
