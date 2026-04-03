import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectTaskCount } from "./capture-guardrail.ts";

// --- Single-task signals (should always return 1) ---

describe("single-task messages", () => {
  it("plain request with a time hint", () => {
    assert.equal(detectTaskCount("do X before starting at Y"), 1);
  });

  it("conversational phrasing", () => {
    assert.equal(detectTaskCount("remind me to call the dentist"), 1);
  });

  it("single task with context", () => {
    assert.equal(detectTaskCount("buy groceries after work today"), 1);
  });

  it("short imperative", () => {
    assert.equal(detectTaskCount("review PR #123"), 1);
  });

  it("ambiguous and/or — defaults to 1", () => {
    assert.equal(detectTaskCount("buy milk and eggs"), 1);
  });
});

// --- Explicit multi-task signals ---

describe("explicit multi-task messages", () => {
  it("'add two tasks:' prefix", () => {
    assert.equal(detectTaskCount("add two tasks: buy milk, call dentist"), 2);
  });

  it("'three things:' prefix", () => {
    assert.equal(detectTaskCount("three things: write email, update doc, send report"), 3);
  });

  it("numbered list", () => {
    assert.equal(
      detectTaskCount("1. Buy milk\n2. Call dentist\n3. Send report"),
      3,
    );
  });

  it("'add N tasks' with digit", () => {
    assert.equal(detectTaskCount("add 4 tasks: a, b, c, d"), 4);
  });

  it("'add tasks:' prefix (plural, no number)", () => {
    assert.equal(detectTaskCount("add tasks: buy milk, call dentist"), 2);
  });
});

// --- Ambiguous edge cases — default to 1 ---

describe("ambiguous edge cases", () => {
  it("two nouns joined by 'and' — single task", () => {
    assert.equal(detectTaskCount("buy bread and butter"), 1);
  });

  it("'and' with no explicit multi-task signal", () => {
    assert.equal(detectTaskCount("finish report and send it"), 1);
  });
});
