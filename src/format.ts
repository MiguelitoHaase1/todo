/**
 * Output formatting for td CLI.
 * Supports both human-readable and --json modes.
 */

import type { Task } from "./supabase.ts";

const PRIORITY_LABELS = ["P0", "P1", "P2", "P3", "P4"] as const;
const PRIORITY_COLORS = ["\x1b[31m", "\x1b[33m", "\x1b[36m", "\x1b[37m", "\x1b[90m"] as const;
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

export function priorityLabel(p: number): string {
  return PRIORITY_LABELS[p] ?? `P${p}`;
}

function colorPriority(p: number): string {
  const color = PRIORITY_COLORS[p] ?? "";
  return `${color}${priorityLabel(p)}${RESET}`;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function formatDate(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diff = Math.floor((target.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 1 && diff <= 7) return `in ${diff}d`;
  if (diff < -1 && diff >= -7) return `${-diff}d ago`;

  return date.toISOString().slice(0, 10);
}

export function formatTaskRow(task: Task): string {
  const id = `${DIM}${shortId(task.id)}${RESET}`;
  const pri = colorPriority(task.priority);
  const due = task.due_date ? ` ${DIM}${formatDate(task.due_date)}${RESET}` : "";
  const status = task.status === "done" ? ` ${DIM}✓${RESET}` : "";
  return `  ${id}  ${pri}  ${task.title}${due}${status}`;
}

export function formatTaskDetail(task: Task, labels?: string[]): string {
  const lines: string[] = [];
  lines.push(`${BOLD}${task.title}${RESET}`);
  lines.push("");
  lines.push(`  ID:        ${task.id}`);
  lines.push(`  Priority:  ${colorPriority(task.priority)}`);
  lines.push(`  Status:    ${task.status}`);
  lines.push(`  Due:       ${task.due_date ? `${task.due_date} (${formatDate(task.due_date)})` : "—"}`);
  if (labels && labels.length > 0) {
    lines.push(`  Labels:    ${labels.join(", ")}`);
  }
  if (task.description) {
    lines.push("");
    lines.push(`  ${DIM}${task.description}${RESET}`);
  }
  lines.push("");
  lines.push(`  ${DIM}Created: ${task.created_at.slice(0, 19).replace("T", " ")}${RESET}`);
  lines.push(`  ${DIM}Updated: ${task.updated_at.slice(0, 19).replace("T", " ")}${RESET}`);
  return lines.join("\n");
}
