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
