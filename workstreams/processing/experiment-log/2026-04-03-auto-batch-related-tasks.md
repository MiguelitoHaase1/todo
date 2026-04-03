# Experiment: Auto-batch related tasks

**Date:** 2026-04-03
**Branch:** experiment/planning/2026-04-03-auto-batch-related-tasks
**Hypothesis:** Products/todolist/ideas-backlog.md — "Auto-batch related tasks"
**Status:** shipped

---

## Problem

Context-switching kills momentum. Tasks that share a label (same project) or a direct link naturally belong together. When scheduled apart, each requires a full context reload.

## Change

Before assigning time slots in Step 7 of the morning flow, detect batch candidates using two pure functions:
- `detectLabelBatches`: finds tasks sharing a label within the same priority tier
- `detectLinkBatches`: finds directly linked tasks within the same priority tier

Batched tasks get consecutive slots. A brief note in the plan shows why.

## Files changed

| File | Change |
|------|--------|
| `Products/todolist/src/batch.ts` | New module — 3 pure functions |
| `Products/todolist/src/batch.test.ts` | 9 new tests (TDD — written first) |
| `Me/Productivity/chief-of-staff/skills/morning.md` | Step 7 updated with batch-candidate detection before slot assignment |

## Test results

- `batch.test.ts`: 9/9 pass
- All prior todolist tests: 60/60 pass, no regressions

## Eval deltas

ps-009 is not yet instrumented. Behavioral measurement pending 2 weeks of live usage.

The mechanism is in place:
- Batch groups are detected before slot assignment
- Same-priority-tier constraint enforced in the helpers (not just docs)
- Max 2 batch suggestions per plan to limit noise
- Priority ordering still governs overall order — batching only reorders within a tier

## Learnings

- Separating detection (pure functions) from scheduling (LLM reasoning) keeps the logic testable.
- The priority-tier constraint is essential — batching P1 with P3 tasks would degrade schedule quality.
- "Max 2 batch suggestions" is a guard against the plan becoming a list of grouping hints rather than an actual schedule.
