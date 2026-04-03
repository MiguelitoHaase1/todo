/**
 * Tests for auto-batch related tasks logic.
 *
 * Hypothesis: Auto-batch related tasks.
 * During day shaping, detect tasks with shared labels or links and suggest back-to-back.
 * Only batch within the same priority tier.
 * TDD: tests written before implementation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectLabelBatches,
  detectLinkBatches,
  formatBatchSuggestion,
  type BatchGroup,
} from "./batch.ts";

type MinTask = { id: string; title: string; priority: number };
type TaskLabelRow = { task_id: string; label_name: string };
type TaskLinkRow = { source_id: string; target_id: string };

// --- detectLabelBatches ---

describe("detectLabelBatches", () => {
  it("groups two tasks sharing a label in the same priority tier", () => {
    const tasks: MinTask[] = [
      { id: "a", title: "Write copy", priority: 1 },
      { id: "b", title: "Design layout", priority: 1 },
    ];
    const rows: TaskLabelRow[] = [
      { task_id: "a", label_name: "website" },
      { task_id: "b", label_name: "website" },
    ];
    const groups = detectLabelBatches(tasks, rows);
    assert.equal(groups.length, 1);
    assert.deepEqual(new Set(groups[0].taskIds), new Set(["a", "b"]));
    assert.equal(groups[0].sharedContext, "website");
  });

  it("does not group tasks with the same label but different priority tiers", () => {
    const tasks: MinTask[] = [
      { id: "a", title: "Write copy", priority: 1 },
      { id: "b", title: "Design layout", priority: 3 },
    ];
    const rows: TaskLabelRow[] = [
      { task_id: "a", label_name: "website" },
      { task_id: "b", label_name: "website" },
    ];
    const groups = detectLabelBatches(tasks, rows);
    assert.equal(groups.length, 0);
  });

  it("groups three tasks with the same label at the same priority", () => {
    const tasks: MinTask[] = [
      { id: "a", title: "A", priority: 2 },
      { id: "b", title: "B", priority: 2 },
      { id: "c", title: "C", priority: 2 },
    ];
    const rows: TaskLabelRow[] = [
      { task_id: "a", label_name: "crm" },
      { task_id: "b", label_name: "crm" },
      { task_id: "c", label_name: "crm" },
    ];
    const groups = detectLabelBatches(tasks, rows);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].taskIds.length, 3);
  });

  it("returns empty when no shared labels", () => {
    const tasks: MinTask[] = [
      { id: "a", title: "A", priority: 1 },
      { id: "b", title: "B", priority: 1 },
    ];
    const rows: TaskLabelRow[] = [
      { task_id: "a", label_name: "crm" },
      { task_id: "b", label_name: "website" },
    ];
    assert.deepEqual(detectLabelBatches(tasks, rows), []);
  });
});

// --- detectLinkBatches ---

describe("detectLinkBatches", () => {
  it("groups two linked tasks in the same priority tier", () => {
    const tasks: MinTask[] = [
      { id: "a", title: "Design API", priority: 1 },
      { id: "b", title: "Implement API", priority: 1 },
    ];
    const links: TaskLinkRow[] = [{ source_id: "a", target_id: "b" }];
    const groups = detectLinkBatches(tasks, links);
    assert.equal(groups.length, 1);
    assert.deepEqual(new Set(groups[0].taskIds), new Set(["a", "b"]));
  });

  it("does not group linked tasks in different priority tiers", () => {
    const tasks: MinTask[] = [
      { id: "a", title: "Design API", priority: 1 },
      { id: "b", title: "Implement API", priority: 3 },
    ];
    const links: TaskLinkRow[] = [{ source_id: "a", target_id: "b" }];
    assert.deepEqual(detectLinkBatches(tasks, links), []);
  });

  it("returns empty when no links between today's tasks", () => {
    const tasks: MinTask[] = [
      { id: "a", title: "A", priority: 1 },
      { id: "b", title: "B", priority: 1 },
    ];
    assert.deepEqual(detectLinkBatches(tasks, []), []);
  });
});

// --- formatBatchSuggestion ---

describe("formatBatchSuggestion", () => {
  it("mentions 'back-to-back'", () => {
    const group: BatchGroup = {
      taskIds: ["a", "b"],
      taskTitles: ["Write copy", "Design layout"],
      sharedContext: "website",
      priority: 1,
    };
    const suggestion = formatBatchSuggestion(group);
    assert.ok(
      suggestion.toLowerCase().includes("back-to-back"),
      `Expected 'back-to-back' in: ${suggestion}`,
    );
  });

  it("includes the shared context", () => {
    const group: BatchGroup = {
      taskIds: ["a", "b"],
      taskTitles: ["Task A", "Task B"],
      sharedContext: "website",
      priority: 1,
    };
    const suggestion = formatBatchSuggestion(group);
    assert.ok(suggestion.includes("website"), `Expected context in: ${suggestion}`);
  });
});
