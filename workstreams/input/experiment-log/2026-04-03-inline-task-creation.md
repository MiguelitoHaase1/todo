# Experiment: Inline task creation on Kanban board

**Date:** 2026-04-03
**Branch:** experiment/input/2026-04-03-inline-task-creation
**Hypothesis:** workstreams/input/ideas-backlog.md — "Inline task creation on Kanban board"
**Status:** shipped

---

## Finding

The feature was already fully implemented in `pwa/index.html` — it arrived as part of the Kanban PWA expansion commit. No new code was needed.

All 4 experiment design criteria verified:
1. **Task appears immediately** — `buildBoard()` is called after successful `createTask()` ✓
2. **Task visible via `td list`** — `createTask()` POSTs to Supabase `/rest/v1/tasks` ✓
3. **Empty title rejected** — `if (!title) { titleInput.focus(); return; }` ✓
4. **P3 default, changeable** — `<option value="3" selected>P3</option>`, full P0–P4 dropdown ✓

## Files changed

| File | Change |
|------|--------|
| `Products/todolist/pwa/inline-task-form.test.mjs` | 10 static-analysis tests verifying all criteria |
| `Products/todolist/workstreams/input/ideas-backlog.md` | Status updated to shipped |

## Test results

- `inline-task-form.test.mjs`: 10/10 pass

## Eval deltas

eval-001 impact pending live usage data. The capture surface now exists at the board level — no channel-switch required.

## Learnings

- Pre-existing implementations can be validated and shipped without re-implementing. The right response to "already done" is to write tests, verify criteria, and mark shipped.
- Static HTML analysis tests are effective for vanilla-JS PWAs with no build-time test runner.
