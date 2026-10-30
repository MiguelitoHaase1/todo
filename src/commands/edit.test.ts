/**
 * Tests for the `td edit` CLI's pure planner.
 *
 * The CLI uses the same compute logic as the MCP tool; these tests mirror
 * the MCP ones against the CLI copy to catch drift between the two surfaces.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeEditUpdates } from "./edit.ts";
import type { Task } from "../supabase.ts";

function mockTask(overrides?: Partial<Task>): Task {
  return {
    task_type: null,
    created_by: "michael",
    review_state: null,
    snoozed_until: null,
    is_next: false,
    id: "abc12345-0000-0000-0000-000000000000",
    title: "Original",
    description: "Desc",
    priority: 3,
    status: "open",
    due_date: "2026-04-20",
    todoist_id: null,
    source_message_id: null,
    deferral_count: 0,
    created_at: "2026-04-20T00:00:00Z",
    updated_at: "2026-04-20T00:00:00Z",
    ...overrides,
  };
}

describe("CLI computeEditUpdates", () => {
  it("no-op when all args undefined", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {});
    assert.deepStrictEqual(updates, {});
    assert.deepStrictEqual(events, []);
  });

  it("updates title", () => {
    const { updates, events } = computeEditUpdates(mockTask(), { title: "New" });
    assert.deepStrictEqual(updates, { title: "New" });
    assert.equal(events[0].event_type, "title_changed");
  });

  it("clears description via empty string", () => {
    const { updates, events } = computeEditUpdates(mockTask(), { description: "" });
    assert.deepStrictEqual(updates, { description: null });
    assert.equal(events[0].event_type, "description_changed");
    assert.equal(events[0].new_value, null);
  });

  it("clears due_date via empty string", () => {
    const { updates, events } = computeEditUpdates(mockTask(), { due_date: "" });
    assert.deepStrictEqual(updates, { due_date: null });
    assert.equal(events[0].event_type, "due_date_set");
    assert.equal(events[0].new_value, null);
  });

  it("emits one event per changed field", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      title: "T",
      description: "D",
      priority: 0,
      due_date: "2026-12-31",
    });
    assert.equal(Object.keys(updates).length, 4);
    assert.equal(events.length, 4);
  });
});

describe("computeEditUpdates — notes append to the description", () => {
  it("appends a dated note under the existing description", () => {
    const { updates, events } = computeEditUpdates(
      mockTask({ description: "Original description" }),
      { notes: "Called, waiting on signature" },
      "2026-10-28",
    );
    assert.deepStrictEqual(updates, {
      description: "Original description\n\nNote 2026-10-28: Called, waiting on signature",
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "description_changed");
    assert.equal(events[0].previous_value, "Original description");
  });

  it("starts the description with the note when it was empty", () => {
    const { updates } = computeEditUpdates(mockTask({ description: null }), { notes: "First" }, "2026-10-28");
    assert.deepStrictEqual(updates, { description: "Note 2026-10-28: First" });
  });

  it("applies a new description first, then appends the note", () => {
    const { updates, events } = computeEditUpdates(
      mockTask(),
      { description: "Fresh", notes: "Also this" },
      "2026-10-28",
    );
    assert.deepStrictEqual(updates, { description: "Fresh\n\nNote 2026-10-28: Also this" });
    assert.equal(events.length, 1, "one description_changed event, not two");
  });

  it("ignores a blank note", () => {
    const { updates, events } = computeEditUpdates(mockTask(), { notes: "   " }, "2026-10-28");
    assert.deepStrictEqual(updates, {});
    assert.deepStrictEqual(events, []);
  });
});
