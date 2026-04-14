---
title: "Behavioral Evals: Planning System"
strategy_slug: "planning-system"
generated: "2026-03-30"
scope: "morning + todo + evening skills as one product"
principles_coverage:
  total: 10
  with_evals: 10
  coverage: 1.0
updated: "2026-04-14 — added ps-010 (Right tasks for the day)"
---

# Planning System Evals

These evals measure planning quality across the morning/todo/evening skill cluster. They encode the principles from `planning-principles.md` and `know-michael.md` into measurable signals.

Data source: `task_events` audit table + `tasks` table + `context.md` entries.
Scoring: computed during the plan-tomorrow Step 0 recap, persisted to `eval_snapshots`.

## Behavioral Evals

### ps-001: Priority holds through the day
- **Principle**: One priority per day
- **Measures**: Does the stated priority match what actually got done?
- **Score**: Days where priority aligns with >=50% of completed P1/P2 work / total days
- **Target**: 0.80
- **Grader**: LLM (semantic match between priority statement and completed task titles)
- **Why it matters**: If priority drifts daily, the planning system isn't constraining attention

### ps-002: Higher priority = earlier scheduling
- **Principle**: P0/P1 in deep work window
- **Measures**: Are high-priority tasks scheduled before 12:00?
- **Score**: P0/P1 tasks before noon / total P0/P1 tasks
- **Target**: 0.90
- **Grader**: Code (compare task time slots against priority)

### ps-003: Family time protection
- **Principle**: 17:00-19:30 is sacred
- **Measures**: Zero tasks scheduled in the protected block
- **Score**: Binary — 1.0 if clean, 0.0 if violated
- **Target**: 1.00
- **Grader**: Code (scan plan for time conflicts)

### ps-004: No silent drops
- **Principle**: Every task gets a decision
- **Measures**: Tasks that left the plan have an explicit event (done/dropped/deferred)
- **Score**: Tasks with events / tasks that disappeared from plan
- **Target**: 0.95
- **Grader**: Code (cross-reference plan tasks with task_events)

### ps-005: Tunnel vision detected
- **Principle**: Flag same-topic priorities 3+ consecutive days
- **Measures**: Are streaks noticed and flagged?
- **Score**: Flagged streaks / actual streaks
- **Target**: 0.80
- **Grader**: LLM (semantic similarity of priority statements across days)

### ps-006: Deferral escalation
- **Principle**: Chronic deferrals get human review
- **Measures**: Tasks with 3+ deferred events that were surfaced to user
- **Score**: Surfaced / total chronic deferrals
- **Target**: 1.00
- **Grader**: Code (count deferred events per task, check if flagged in triage/plan)

### ps-007: Completion by priority tier
- **Principle**: P0/P1 same day, P2 within week
- **Measures**: Composite: (P0/P1 same-day rate * 0.6) + (P2 within-7-days rate * 0.4)
- **Score**: Weighted composite
- **Target**: 0.85
- **Grader**: Code (task_events created vs status_changed timestamps by priority)

### ps-008: Planning routine consistency
- **Principle**: Plan tomorrow runs most evenings
- **Measures**: Weekdays with a plan-tomorrow session / total weekdays
- **Score**: Ratio over rolling 7 days
- **Target**: 0.80
- **Grader**: Code (check context.md Tomorrow Draft entries or task_events with source=plan_tomorrow)

### ps-009: Plan realism
- **Principle**: Plans should be achievable
- **Measures**: Rolling 7-day average of tasks completed / tasks planned
- **Score**: Completion rate average
- **Target**: 0.75
- **Grader**: Code (tasks due on date with status=done / tasks due on date)

### ps-010: Right tasks for the day
- **Principle**: Synthesis picks the tasks Michael actually completes, given priority, diary history, calendar, and available time
- **Measures**: Overlap between planned set and completed set on the same day
- **Score**: Rolling 7-day average of `|planned ∩ completed| / |completed|`
- **Target**: 0.75
- **Grader**: Code (Supabase tasks with status=done that day vs. tasks listed in that day's context.md Priorities entry)
- **Why it matters**: This is the flagship planning eval — the thing the auto-triage-using-diary hypothesis is designed to move. ps-001 covers *priority topic alignment*, ps-009 covers *plan volume*, but neither directly grades *which* tasks are picked. ps-010 does.

**Negative cases:**
- 5 planned, 4 completed, but 3 of the 4 were unplanned mid-day picks → 0.25
- Plan ignored a task deferred 3 days; Michael did it first thing anyway → 0.5
- 8 planned, 6 done, all 6 were planned (overloaded but right picks) → 1.0
- Plan was all meetings, no work tasks; Michael worked entirely off-plan → 0.0

## Guardrails

### ps-guard-001: Family time zero violations
- **Fail condition**: Any task with timestamps in 17:00-19:30 window
- **Target**: 0 violations

### ps-guard-002: No orphaned plan items
- **Fail condition**: Task on plan one day, gone the next, no event logged
- **Target**: 0 orphans
