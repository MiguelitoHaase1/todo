/**
 * Shared Zod schemas for tool inputs.
 *
 * Pinned to Zod v3 — the MCP TypeScript SDK v1 expects v3 schemas.
 */

import { z } from "zod";

/** Task ID — full UUID or short prefix (min 4 chars to disambiguate). */
export const TaskIdSchema = z
  .string()
  .min(4, "task id must be at least 4 characters")
  .max(36, "task id must not exceed 36 characters")
  .describe("Task UUID or short prefix (min 4 chars). The CLI also accepts prefixes — same here.");

/** Priority 0-4 (0 = highest, 3 = default, 4 = backlog). */
export const PrioritySchema = z
  .number()
  .int()
  .min(0)
  .max(4)
  .describe("Priority 0-4. 0=critical, 3=default, 4=backlog. Lower number = higher priority.");

/** ISO date YYYY-MM-DD. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be ISO date YYYY-MM-DD")
  .describe("ISO date in YYYY-MM-DD format.");

/** Task status filter. */
export const StatusFilterSchema = z
  .enum(["open", "done", "dropped", "all"])
  .describe('Filter by status. "all" includes every task regardless of state.');
