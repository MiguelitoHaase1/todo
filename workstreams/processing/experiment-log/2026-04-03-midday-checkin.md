# Experiment: Midday priority check-in

**Date:** 2026-04-03
**Branch:** experiment/planning/2026-04-03-midday-checkin
**Hypothesis:** Products/todolist/ideas-backlog.md — "Midday priority check-in"
**Status:** shipped

---

## Problem

Priority drift goes undetected until the evening recap. By then, the damage is done — 4+ hours misdirected. No lightweight intervention exists mid-day.

## Change

At plan approval (Step 12 of morning.md), offer an opt-in 13:00 check-in. Easy to say yes, easy to say no. Auto-disables after 3 consecutive ignores.

## Files changed

| File | Change |
|------|--------|
| `Me/Productivity/chief-of-staff/src/checkin.ts` | New module — 3 pure functions |
| `Me/Productivity/chief-of-staff/src/checkin.test.ts` | 9 new tests (TDD — written first) |
| `Me/Productivity/chief-of-staff/skills/morning.md` | Step 12 approval flow extended with opt-in check-in prompt |
| `Me/Productivity/chief-of-staff/package.json` | Test glob updated from single file to `src/*.test.ts` |

## Test results

- `checkin.test.ts`: 9/9 pass
- `render-morning-brew.test.ts`: 7/7 pass
- Total: 16/16 pass, no regressions

## Eval deltas

ps-001 is not instrumented. Behavioral measurement pending 2 weeks of live usage.

The mechanism is in place:
- `buildOptInPrompt(priority)` shows the prompt at approval
- `buildCheckinMessage(priority)` shows the exact 13:00 text the user would receive
- `shouldAutoDisable(streak)` prevents nagging after 3 ignores
- Opt-in preference persisted via `checkin_ignored_streak` in context.md

## Learnings

- Pure functions make this fully testable without any scheduling infrastructure.
- The opt-in framing (explicit yes/no at approval) avoids the "surprise message" UX problem.
- Auto-disable threshold of 3 gives benefit of the doubt — 3 ignores is a clear signal to back off.
- Context.md `## Preferences` section becomes the persistence layer for this setting.
