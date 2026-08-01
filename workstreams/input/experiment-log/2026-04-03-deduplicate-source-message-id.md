# Experiment: Deduplicate task capture via source message ID

**Date:** 2026-04-03
**Branch:** experiment/input/2026-04-03-deduplicate-source-message-id
**Status:** shipped
**Target eval:** eval-001 (Capture a task instantly)

## Problem

Multiple Claude Code sessions process the same Discord message simultaneously.
Each session calls `sbInsert("tasks", ...)` independently — creating duplicate
tasks with different titles and priorities. Observed 5+ times in 48 hours.
Each duplicate is a direct trust hit for eval-001.

## Change

Three files added, one updated:

| File | Change |
|------|--------|
| `supabase/migrations/20260403000000_add_source_message_id.sql` | New column + partial unique index |
| `src/dedup.ts` | Pure helpers: `buildTaskInsertOptions`, `isDuplicateIgnored` |
| `src/dedup.test.ts` | 8 tests covering both functions |
| `src/format.ts` | New — was missing; fixes pre-existing triage test failure |
| `src/supabase.ts` | Added `source_message_id` to Task interface |
| `src/commands/triage.test.ts` | Added `source_message_id: null` to mockTask |

### Migration

```sql
alter table tasks add column source_message_id text;
create unique index idx_tasks_source_message_id
  on tasks(source_message_id)
  where source_message_id is not null;
```

Partial index (nulls excluded) keeps existing tasks working with no changes.

### Deduplication protocol

When the /todo skill captures a task from Discord:

1. Extract the platform message ID (Discord's `message.id`, iMessage's GUID)
2. Call `buildTaskInsertOptions(data, messageId)` to get the right fetch options
3. POST to `tasks?on_conflict=source_message_id` with `resolution=ignore-duplicates`
4. If `isDuplicateIgnored(rows)` → no-op, return silently (no error to user)
5. Otherwise → return the newly created task as usual

## Test results

```
# tests 27
# pass  27
# fail  0
```

All 19 existing triage tests pass (previously failing due to missing `format.ts`).
8 new dedup tests pass.

## Eval delta estimate

- **Before:** Duplicate tasks on every multi-session capture event (≈5 dupes/week)
- **After:** At most 1 task created per platform message ID, regardless of session count
- **Estimated eval-001 delta:** +0.20–0.30 (eliminates whole duplication class)

## Remaining work

The /todo skill (`~/.claude/skills/todo/SKILL.md`) must pass `source_message_id`
from the platform message metadata on every task create call. That wiring is outside
the repo but uses `buildTaskInsertOptions` as the integration point.
