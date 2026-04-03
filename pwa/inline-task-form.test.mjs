/**
 * Static validation tests for inline task creation on the Kanban board.
 *
 * Hypothesis: Inline task creation on Kanban board.
 * These tests verify the experiment design criteria against the static HTML source.
 *
 * No DOM environment needed — we check the source template directly.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("index.html", import.meta.url), "utf-8");

describe("Inline task creation — form exists in template", () => {
  it("has '+ Add task' trigger button in the column template", () => {
    assert.ok(html.includes("add-task-trigger"), "Missing .add-task-trigger button");
    assert.ok(html.includes("+ Add task"), "Missing '+ Add task' label");
  });

  it("has the add-task-form container in the column template", () => {
    assert.ok(html.includes("add-task-form"), "Missing .add-task-form container");
  });

  it("has a title text input in the form", () => {
    assert.ok(html.includes('class="add-title"'), "Missing .add-title input");
  });

  it("defaults to P3 priority", () => {
    assert.ok(
      html.includes('value="3" selected'),
      "P3 option is not selected by default",
    );
  });

  it("has all priority options P0–P4", () => {
    for (const p of ["0", "1", "2", "3", "4"]) {
      assert.ok(html.includes(`value="${p}"`), `Missing priority P${p} option`);
    }
  });
});

describe("Inline task creation — save logic", () => {
  it("has a save button", () => {
    assert.ok(html.includes("add-btn-save"), "Missing .add-btn-save button");
  });

  it("has a cancel button", () => {
    assert.ok(html.includes("add-btn-cancel"), "Missing .add-btn-cancel button");
  });

  it("rejects empty title (guard in submitAddTask)", () => {
    // Verify the guard: if (!title) { titleInput.focus(); return; }
    assert.ok(html.includes("if (!title)"), "Missing empty-title guard in submitAddTask");
  });

  it("calls createTask with title, priority, and due_date", () => {
    assert.ok(
      html.includes("createTask({ title, priority, due_date: date })"),
      "Missing createTask call with correct parameters",
    );
  });

  it("calls buildBoard() after successful submit (immediate board update)", () => {
    assert.ok(html.includes("buildBoard()"), "Missing buildBoard() call after submit");
  });
});
