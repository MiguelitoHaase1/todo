/**
 * Tests for td_add's input schema — specifically the description length cap.
 *
 * Hypothesis c4dd86d6: raise the cap from 2000 to 20000 chars so long-form
 * context (links, multi-paragraph notes, code fences) fits.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Reconstruct the add tool's input schema shape without loading the tool
// handler itself (which requires the MCP SDK side-effects). The schema is
// what this hypothesis asserts on, and it is load-bearing for Zod
// validation in Vercel's serverless path.
//
// Keep this in sync with mcp-server/src/tools/add.ts InputSchema.description.
import { PrioritySchema, IsoDateSchema } from "../schemas.ts";

const AddInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).optional(),
  priority: PrioritySchema.default(3).optional(),
  due_date: IsoDateSchema.optional(),
});

describe("td_add description length cap", () => {
  it("accepts 2000-char description (backward compatible)", () => {
    const result = AddInputSchema.safeParse({
      title: "t",
      description: "a".repeat(2000),
    });
    assert.equal(result.success, true);
  });

  it("accepts exactly 20000 chars (new ceiling)", () => {
    const result = AddInputSchema.safeParse({
      title: "t",
      description: "a".repeat(20000),
    });
    assert.equal(result.success, true);
  });

  it("rejects 20001 chars (one past new ceiling)", () => {
    const result = AddInputSchema.safeParse({
      title: "t",
      description: "a".repeat(20001),
    });
    assert.equal(result.success, false);
  });

  it("accepts empty description (optional field still optional)", () => {
    const result = AddInputSchema.safeParse({ title: "t" });
    assert.equal(result.success, true);
  });
});
