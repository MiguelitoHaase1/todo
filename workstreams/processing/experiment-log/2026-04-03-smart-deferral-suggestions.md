# Experiment: Smart deferral suggestions

**Date:** 2026-04-03
**Branch:** experiment/planning/2026-04-03-smart-deferral-suggestions
**Hypothesis:** Products/todolist/ideas-backlog.md — "Smart deferral suggestions"
**Status:** shipped

---

## Problem

Tasks deferred 2+ times sit in limbo. No conscious decision is ever forced. They silently re-defer forever, eroding trust in the backlog.

## Change

Added deferral escalation: when a task's `deferral_count` reaches 2, the morning flow surfaces "Drop or promote?" instead of silently re-deferring.

## Files changed

| File | Change |
|------|--------|
| `Products/todolist/src/deferral.ts` | New module — 4 pure functions for escalation detection and messaging |
| `Products/todolist/src/deferral.test.ts` | 12 new tests (TDD — written first) |
| `Products/todolist/src/supabase.ts` | Added `deferral_count: number` to `Task` interface |
| `Products/todolist/supabase/migrations/20260403100000_add_deferral_count.sql` | `ALTER TABLE tasks ADD COLUMN deferral_count int NOT NULL DEFAULT 0` |
| `Me/Productivity/chief-of-staff/skills/morning.md` | Deferral escalation section added to Step 2 (deferred tasks mapping) |
| `Me/Productivity/chief-of-staff/package.json` | Resolved merge conflict (kept upstream: node test runner) |

## Test results

- `deferral.test.ts`: 12/12 pass
- All prior tests (capture-guardrail, dedup, triage): 39/39 pass
- `render-morning-brew.test.ts`: 7/7 pass

**No regressions.**

## Eval deltas

ps-006 and ps-004 are not yet instrumented. Behavioral measurement pending 2 weeks of live usage.

The logic is in place:
- `shouldEscalateDeferral(task)` returns true at deferral_count ≥ 2
- Morning flow will show escalation prompt, capped at 3 per session
- User replies "drop", "promote", or "keep" — each routes to an explicit action
- Every deferral (overflow, reschedule, drag) increments `deferral_count` via `markDeferred(task)`

## Learnings

- The existing code had no deferral tracking. This is the baseline implementation.
- Pure functions make the logic fully testable without Supabase.
- The threshold of 2 (not 3) is deliberate: 2 deferrals = the task has been avoided twice, which is enough signal for a conscious decision.
- Cap of 3 escalations per session protects against noise on days with many stale deferred tasks.
