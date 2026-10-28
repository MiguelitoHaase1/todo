/**
 * Tests for td_edit — pure-logic coverage of computeEditUpdates.
 *
 * Hypothesis c0adfd21. Semantics under test:
 *   - undefined → skip field
 *   - empty string on description/due_date → clear (null)
 *   - same value → no event emitted
 *   - each changed field → one task_events row with correct event_type
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeEditUpdates } from "./edit.ts";
import type { Task } from "../_shared/supabase.ts";

function mockTask(overrides?: Partial<Task>): Task {
  return {
    task_type: null,
    created_by: "michael",
    review_state: null,
    id: "abc12345-0000-0000-0000-000000000000",
    title: "Original title",
    description: "Original description",
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

describe("computeEditUpdates — undefined fields are skipped", () => {
  it("returns no updates and no events when every arg is undefined", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {});
    assert.deepStrictEqual(updates, {});
    assert.deepStrictEqual(events, []);
  });

  it("ignores title when passed current title (same-value write)", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      title: "Original title",
    });
    assert.deepStrictEqual(updates, {});
    assert.deepStrictEqual(events, []);
  });
});

describe("computeEditUpdates — single-field updates", () => {
  it("updates title and emits title_changed", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      title: "New title",
    });
    assert.deepStrictEqual(updates, { title: "New title" });
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "title_changed");
    assert.equal(events[0].previous_value, "Original title");
    assert.equal(events[0].new_value, "New title");
  });

  it("updates description and emits description_changed", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      description: "New desc",
    });
    assert.deepStrictEqual(updates, { description: "New desc" });
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "description_changed");
    assert.equal(events[0].previous_value, "Original description");
    assert.equal(events[0].new_value, "New desc");
  });

  it("updates priority and emits priority_changed", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      priority: 1,
    });
    assert.deepStrictEqual(updates, { priority: 1 });
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "priority_changed");
    assert.equal(events[0].previous_value, "3");
    assert.equal(events[0].new_value, "1");
  });

  it("updates due_date and emits due_date_set", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      due_date: "2026-05-15",
    });
    assert.deepStrictEqual(updates, { due_date: "2026-05-15" });
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "due_date_set");
    assert.equal(events[0].previous_value, "2026-04-20");
    assert.equal(events[0].new_value, "2026-05-15");
  });
});

describe("computeEditUpdates — clearing fields via empty string", () => {
  it("clears description when passed empty string", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      description: "",
    });
    assert.deepStrictEqual(updates, { description: null });
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "description_changed");
    assert.equal(events[0].new_value, null);
  });

  it("clears due_date when passed empty string", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      due_date: "",
    });
    assert.deepStrictEqual(updates, { due_date: null });
    assert.equal(events.length, 1);
    assert.equal(events[0].event_type, "due_date_set");
    assert.equal(events[0].new_value, null);
  });

  it("does not emit description_changed when description already null and empty passed", () => {
    const { updates, events } = computeEditUpdates(
      mockTask({ description: null }),
      { description: "" },
    );
    assert.deepStrictEqual(updates, {});
    assert.deepStrictEqual(events, []);
  });
});

describe("computeEditUpdates — multi-field updates", () => {
  it("emits one event per changed field, in deterministic order", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      title: "New",
      description: "Also new",
      priority: 0,
      due_date: "2026-12-31",
    });
    assert.deepStrictEqual(updates, {
      title: "New",
      description: "Also new",
      priority: 0,
      due_date: "2026-12-31",
    });
    assert.equal(events.length, 4);
    const types = events.map((e) => e.event_type);
    assert.deepStrictEqual(types, [
      "title_changed",
      "description_changed",
      "priority_changed",
      "due_date_set",
    ]);
  });

  it("only emits for fields that actually change — mixed same/new values", () => {
    const { updates, events } = computeEditUpdates(mockTask(), {
      title: "Original title", // same → skip
      priority: 1, // change
      due_date: "2026-04-20", // same → skip
      description: "Changed", // change
    });
    assert.deepStrictEqual(updates, { priority: 1, description: "Changed" });
    assert.equal(events.length, 2);
    assert.equal(events[0].event_type, "description_changed");
    assert.equal(events[1].event_type, "priority_changed");
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
