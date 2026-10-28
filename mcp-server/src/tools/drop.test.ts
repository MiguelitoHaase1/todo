/**
 * Tests for td_drop — pure-logic coverage of the idempotent short-circuit.
 *
 * Hypothesis 77407be7. The mutating path shells out to Supabase; what's worth
 * testing in isolation is the "already dropped" branch and the shape of the
 * event payload we'd emit on a real drop.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeDropTransition } from "./drop.ts";
import type { Task } from "../_shared/supabase.ts";

function mockTask(overrides?: Partial<Task>): Task {
  return {
    task_type: null,
    created_by: "michael",
    review_state: null,
    id: "abc12345-0000-0000-0000-000000000000",
    title: "Original title",
    description: null,
    priority: 3,
    status: "open",
    due_date: null,
    todoist_id: null,
    source_message_id: null,
    deferral_count: 0,
    created_at: "2026-04-20T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
    ...overrides,
  };
}

describe("computeDropTransition — idempotent short-circuit", () => {
  it("returns alreadyDropped=true when the task is already dropped", () => {
    const result = computeDropTransition(mockTask({ status: "dropped" }));
    assert.strictEqual(result.alreadyDropped, true);
    assert.strictEqual(result.event, null, "no event is emitted for a no-op drop");
  });

  it("returns alreadyDropped=false for an open task + a status_changed event payload", () => {
    const task = mockTask({ status: "open" });
    const result = computeDropTransition(task);
    assert.strictEqual(result.alreadyDropped, false);
    assert.ok(result.event, "event payload must exist on a real drop");
    assert.strictEqual(result.event.task_id, task.id);
    assert.strictEqual(result.event.event_type, "status_changed");
    assert.strictEqual(result.event.previous_value, "open");
    assert.strictEqual(result.event.new_value, "dropped");
    assert.strictEqual(result.event.source, "mcp");
  });

  it("preserves the origin status on the event payload (done → dropped)", () => {
    // Rare but valid: a task marked done can still be dropped if the user
    // wants to drop it outright. The event must carry previous_value='done'.
    const result = computeDropTransition(mockTask({ status: "done" }));
    assert.strictEqual(result.alreadyDropped, false);
    assert.strictEqual(result.event?.previous_value, "done");
    assert.strictEqual(result.event?.new_value, "dropped");
  });
});
