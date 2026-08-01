import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTaskMessage } from "./parse-task.ts";

describe("parseTaskMessage", () => {
  it("extracts title, priority, and due date", () => {
    const result = parseTaskMessage("Call dentist 2026-04-01 p1");
    assert.equal(result.title, "Call dentist");
    assert.equal(result.priority, 1);
    assert.equal(result.dueDate, "2026-04-01");
  });

  it("handles priority at end", () => {
    const result = parseTaskMessage("Buy milk p2");
    assert.equal(result.title, "Buy milk");
    assert.equal(result.priority, 2);
    assert.equal(result.dueDate, null);
  });

  it("handles priority before date", () => {
    const result = parseTaskMessage("Fix the roof p0 2026-05-15");
    assert.equal(result.title, "Fix the roof");
    assert.equal(result.priority, 0);
    assert.equal(result.dueDate, "2026-05-15");
  });

  it("defaults to P3 when no priority given", () => {
    const result = parseTaskMessage("Just a task");
    assert.equal(result.title, "Just a task");
    assert.equal(result.priority, 3);
    assert.equal(result.dueDate, null);
  });

  it("handles uppercase P", () => {
    const result = parseTaskMessage("Urgent thing P0");
    assert.equal(result.priority, 0);
    assert.equal(result.title, "Urgent thing");
  });

  it("preserves special characters in title", () => {
    const result = parseTaskMessage("Tøm kælderen p1");
    assert.equal(result.title, "Tøm kælderen");
    assert.equal(result.priority, 1);
  });

  it("handles date-only input", () => {
    const result = parseTaskMessage("Submit report 2026-04-30");
    assert.equal(result.title, "Submit report");
    assert.equal(result.dueDate, "2026-04-30");
    assert.equal(result.priority, 3);
  });
});
