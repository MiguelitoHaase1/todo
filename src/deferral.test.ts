/**
 * Tests for deferral escalation logic.
 *
 * Hypothesis: Smart deferral suggestions.
 * When a task hits 2 deferrals, surface "drop or promote?" instead of re-deferring silently.
 * TDD: tests written before implementation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  shouldEscalateDeferral,
  escalationMessage,
  markDeferred,
  filterEscalationCandidates,
} from "./deferral.ts";

// Minimal task shape for these tests
function makeTask(overrides: {
  id?: string;
  title?: string;
  deferral_count?: number;
}) {
  return {
    id: overrides.id ?? "task-1",
    title: overrides.title ?? "Untitled task",
    deferral_count: overrides.deferral_count ?? 0,
  };
}

// --- shouldEscalateDeferral ---

describe("shouldEscalateDeferral", () => {
  it("returns false when deferral_count is 0", () => {
    assert.equal(shouldEscalateDeferral(makeTask({ deferral_count: 0 })), false);
  });

  it("returns false when deferral_count is 1", () => {
    assert.equal(shouldEscalateDeferral(makeTask({ deferral_count: 1 })), false);
  });

  it("returns true when deferral_count is exactly 2 (threshold)", () => {
    assert.equal(shouldEscalateDeferral(makeTask({ deferral_count: 2 })), true);
  });

  it("returns true when deferral_count is above 2", () => {
    assert.equal(shouldEscalateDeferral(makeTask({ deferral_count: 5 })), true);
  });
});

// --- escalationMessage ---

describe("escalationMessage", () => {
  it("includes the task title", () => {
    const msg = escalationMessage(makeTask({ title: "Ship investor deck", deferral_count: 2 }));
    assert.ok(msg.includes("Ship investor deck"), `Expected title in: ${msg}`);
  });

  it("includes 'drop or promote'", () => {
    const msg = escalationMessage(makeTask({ deferral_count: 2 }));
    assert.ok(
      msg.toLowerCase().includes("drop or promote"),
      `Expected 'drop or promote' in: ${msg}`,
    );
  });

  it("includes the deferral count", () => {
    const msg = escalationMessage(makeTask({ deferral_count: 3 }));
    assert.ok(msg.includes("3"), `Expected count '3' in: ${msg}`);
  });
});

// --- markDeferred ---

describe("markDeferred", () => {
  it("increments deferral_count by 1 from 0", () => {
    const patch = markDeferred(makeTask({ deferral_count: 0 }));
    assert.equal(patch.deferral_count, 1);
  });

  it("increments deferral_count by 1 from 2", () => {
    const patch = markDeferred(makeTask({ deferral_count: 2 }));
    assert.equal(patch.deferral_count, 3);
  });

  it("handles missing deferral_count (undefined) as 0", () => {
    const task = { id: "x", title: "task" } as { id: string; title: string; deferral_count?: number };
    const patch = markDeferred(task);
    assert.equal(patch.deferral_count, 1);
  });
});

// --- filterEscalationCandidates ---

describe("filterEscalationCandidates", () => {
  it("returns only tasks at or above the deferral threshold", () => {
    const tasks = [
      makeTask({ id: "a", deferral_count: 0 }),
      makeTask({ id: "b", deferral_count: 1 }),
      makeTask({ id: "c", deferral_count: 2 }),
      makeTask({ id: "d", deferral_count: 4 }),
    ];
    const candidates = filterEscalationCandidates(tasks);
    assert.deepEqual(
      candidates.map((t) => t.id),
      ["c", "d"],
    );
  });

  it("returns empty array when no tasks hit the threshold", () => {
    const tasks = [
      makeTask({ deferral_count: 0 }),
      makeTask({ deferral_count: 1 }),
    ];
    assert.deepEqual(filterEscalationCandidates(tasks), []);
  });
});
