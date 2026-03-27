import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTriageReply, formatTriageMessage, executeTriageActions } from "./triage.ts";
import type { TriageItem } from "./triage.ts";
import type { Task } from "../supabase.ts";

function mockTask(overrides?: Partial<Task>): Task {
  return {
    id: "abc12345-0000-0000-0000-000000000000",
    title: "Test task",
    priority: 3,
    status: "open",
    due_date: null,
    description: null,
    todoist_id: null,
    created_at: "2026-03-20T00:00:00Z",
    updated_at: "2026-03-20T00:00:00Z",
    ...overrides,
  };
}

describe("parseTriageReply", () => {
  it("parses single action", () => {
    const result = parseTriageReply("drop 1", 5);
    assert.deepStrictEqual(result, [{ action: "drop", indices: [1] }]);
  });

  it("parses multiple indices", () => {
    const result = parseTriageReply("drop 1 3", 5);
    assert.deepStrictEqual(result, [{ action: "drop", indices: [1, 3] }]);
  });

  it("parses comma-separated actions", () => {
    const result = parseTriageReply("drop 1, defer 2, keep 3", 5);
    assert.deepStrictEqual(result, [
      { action: "drop", indices: [1] },
      { action: "defer", indices: [2] },
      { action: "keep", indices: [3] },
    ]);
  });

  it("parses 'drop all'", () => {
    const result = parseTriageReply("drop all", 3);
    assert.deepStrictEqual(result, [{ action: "drop", indices: [1, 2, 3] }]);
  });

  it("parses 'keep all'", () => {
    const result = parseTriageReply("keep all", 2);
    assert.deepStrictEqual(result, [{ action: "keep", indices: [1, 2] }]);
  });

  it("ignores out-of-range indices", () => {
    const result = parseTriageReply("drop 1 99", 5);
    assert.deepStrictEqual(result, [{ action: "drop", indices: [1] }]);
  });

  it("handles case insensitivity", () => {
    const result = parseTriageReply("DROP 1, DEFER 2", 5);
    assert.deepStrictEqual(result, [
      { action: "drop", indices: [1] },
      { action: "defer", indices: [2] },
    ]);
  });

  it("returns empty for unrecognized input", () => {
    const result = parseTriageReply("hello world", 5);
    assert.deepStrictEqual(result, []);
  });
});

describe("formatTriageMessage", () => {
  it("returns clean message for empty list", () => {
    const msg = formatTriageMessage([]);
    assert.equal(msg, "Nothing to triage \u2014 you're clean.");
  });

  it("formats items with numbers and reasons", () => {
    const items: TriageItem[] = [
      { index: 1, task: mockTask({ priority: 2 }), reason: "stale, no date" },
    ];
    const msg = formatTriageMessage(items);
    assert.ok(msg.includes("1 tasks to triage"));
    assert.ok(msg.includes("1. Test task"));
    assert.ok(msg.includes("P2"));
    assert.ok(msg.includes("stale, no date"));
    assert.ok(msg.includes("Reply: drop 1, defer 3, keep 2"));
  });
});

describe("executeTriageActions", () => {
  it("returns 'No actions taken.' for empty actions", async () => {
    const result = await executeTriageActions([], []);
    assert.equal(result, "No actions taken.");
  });

  it("returns 'Kept' for keep actions without hitting Supabase", async () => {
    const items: TriageItem[] = [
      { index: 1, task: mockTask({ title: "Keep me" }), reason: "stale" },
    ];
    const actions = parseTriageReply("keep 1", 1);
    const result = await executeTriageActions(items, actions);
    assert.equal(result, "Kept: Keep me");
  });
});
