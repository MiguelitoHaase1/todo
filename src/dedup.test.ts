import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTaskInsertOptions, isDuplicateIgnored } from "./dedup.ts";

describe("buildTaskInsertOptions — no source_message_id", () => {
  it("uses plain POST with return=representation", () => {
    const opts = buildTaskInsertOptions({ title: "Buy oat milk" });
    assert.equal(opts.urlSuffix, "");
    assert.equal(opts.prefer, "return=representation");
    assert.deepStrictEqual(opts.body, { title: "Buy oat milk" });
  });
});

describe("buildTaskInsertOptions — with source_message_id", () => {
  it("adds on_conflict suffix", () => {
    const opts = buildTaskInsertOptions({ title: "Buy oat milk" }, "discord-123");
    assert.equal(opts.urlSuffix, "?on_conflict=source_message_id");
  });

  it("sets resolution=ignore-duplicates in Prefer header", () => {
    const opts = buildTaskInsertOptions({ title: "Buy oat milk" }, "discord-123");
    assert.equal(opts.prefer, "resolution=ignore-duplicates,return=representation");
  });

  it("injects source_message_id into body", () => {
    const opts = buildTaskInsertOptions({ title: "Buy oat milk" }, "discord-123");
    assert.deepStrictEqual(opts.body, {
      title: "Buy oat milk",
      source_message_id: "discord-123",
    });
  });

  it("does not mutate the original data object", () => {
    const data = { title: "Immutable check" };
    buildTaskInsertOptions(data, "discord-456");
    assert.equal("source_message_id" in data, false);
  });
});

describe("isDuplicateIgnored", () => {
  it("returns true for empty array (duplicate was silently ignored)", () => {
    assert.equal(isDuplicateIgnored([]), true);
  });

  it("returns false when a row was returned (new task inserted)", () => {
    assert.equal(isDuplicateIgnored([{ id: "abc", title: "Task" }]), false);
  });

  it("returns false for non-array values", () => {
    assert.equal(isDuplicateIgnored("not-an-array" as unknown as unknown[]), false);
  });
});
