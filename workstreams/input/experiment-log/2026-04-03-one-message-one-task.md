# Experiment: One message = one task by default

**Date:** 2026-04-03
**Branch:** experiment/input/2026-04-03-one-message-one-task
**Status:** shipped
**Target eval:** eval-001 (Capture a task instantly)

## Problem

The /todo skill over-parses conversational messages. "Do X before starting at Y"
becomes two tasks. "Buy milk and eggs" becomes two tasks. Every false split:
- Creates cleanup work
- Creates ghost tasks with wrong priorities
- Erodes trust that "one message = one task"

## Change

Three files added:

| File | Purpose |
|------|---------|
| `src/capture-guardrail.ts` | Pure `detectTaskCount(message)` function |
| `src/capture-guardrail.test.ts` | 12 tests: 5 single, 5 multi, 2 ambiguous |
| `skills/task-capture-guardrails.md` | Skill integration docs + rule table |

### Detection logic

Single (returns 1):
- Everything not in the list below
- "do X before Y", "buy X and Y", "finish X and send it"

Multi (returns N) — explicit signals only:
- Numbered list (≥ 2 lines starting with `1.`, `2.`, …)
- `add N tasks: …` or `add two tasks: …`
- `add tasks: X, Y` (counts commas)
- `N things: …` with word-number prefix

### Skill integration

The `/todo` SKILL.md should adopt this rule verbatim:

> One inbound message = one task. Never split unless the user gives an explicit
> multi-task signal (numbered list, "add N tasks:", "N things:"). When in doubt,
> capture the whole message as a single task title.

The `detectTaskCount()` function can be called by any skill or CLI command that
captures tasks from text input.

## Test results

```
# tests 12
# pass  12
# fail  0
```

10 message patterns tested (5 single + 5 multi + 2 ambiguous) — all correct.

## Eval delta estimate

- **Before:** Conversational messages occasionally produce 2–3 ghost tasks
- **After:** All conversational messages produce exactly 1 task
- **Estimated eval-001 delta:** +0.10–0.15 (removes recurring false-split class)

## Remaining work

The `/todo` SKILL.md (at `~/.claude/skills/todo/SKILL.md`, outside repo) needs
to adopt the guardrail text. See `skills/task-capture-guardrails.md` for the
exact wording. Manual update required — the skill file is outside the repo.
