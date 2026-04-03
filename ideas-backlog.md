# Planning System — Ideas Backlog

Structured hypotheses for improving the planning system. Consumed by the continuous improvement loop.

## Smart deferral suggestions
- **Status:** shipped
- **Date added:** 2026-03-30
- **Problem statement:** Tasks deferred 2+ times sit in limbo — they keep getting pushed without a conscious decision to drop or promote them.
- **Proposed change:** When a task hits 2 deferrals, the plan-tomorrow flow suggests "drop or promote?" instead of silently re-deferring.
- **Target eval(s):** ps-006 (deferral escalation), ps-004 (no silent drops)
- **Expected delta:** ps-006: +0.15, ps-004: +0.05
- **Risks / counterarguments:** Could feel nagging if the user genuinely wants to defer. Mitigate by only suggesting once per task per planning session.
- **Experiment design:** Lower deferral threshold from 3 to 2 in plan-tomorrow Step 1 carry-over logic. Measure ps-006 before/after over 2 weeks.
- **Result:** Shipped. Added `deferral_count int NOT NULL DEFAULT 0` column via migration. Created `src/deferral.ts` with `shouldEscalateDeferral()`, `escalationMessage()`, `markDeferred()`, `filterEscalationCandidates()` — all pure functions, 12/12 tests pass. Updated `Task` interface in `supabase.ts`. Updated `skills/morning.md` with deferral escalation guidance in the deferred-tasks section: surfaces "drop or promote?" at threshold ≥ 2, caps at 3 prompts per session, routes "drop"/"promote"/"keep" to explicit actions. 7/7 chief-of-staff tests pass, no regressions.

## Midday priority check-in
- **Status:** shipped
- **Date added:** 2026-03-30
- **Problem statement:** Priority drift happens mid-day and isn't caught until the evening recap. By then, 4+ hours of misdirected work may have passed.
- **Proposed change:** Send a brief iMessage at 13:00 asking "Still on track with [priority]?" If user says no, offer to re-triage the afternoon.
- **Target eval(s):** ps-001 (priority holds through the day)
- **Expected delta:** ps-001: +0.10
- **Risks / counterarguments:** Could be annoying. Must be easy to dismiss ("yes" = one word, done). If user ignores it 3x in a row, auto-disable for a week.
- **Experiment design:** Add a scheduled iMessage check-in to the plan-tomorrow flow (opt-in). Measure ps-001 before/after over 2 weeks.
- **Result:** Shipped. Created `src/checkin.ts` with `buildCheckinMessage()`, `shouldAutoDisable()`, `buildOptInPrompt()` — pure functions, 9/9 tests pass. Updated morning.md Step 12 to offer opt-in check-in at plan approval. Auto-disables at streak ≥ 3. Package.json test script now runs all test files (16/16 pass, no regressions).

## Auto-batch related tasks
- **Status:** queued
- **Date added:** 2026-03-30
- **Problem statement:** Context-switching between unrelated tasks wastes time. Related tasks (same label, linked) scheduled apart don't benefit from momentum.
- **Proposed change:** When shaping the day (Step 4), detect tasks with shared labels or task_links and suggest scheduling them back-to-back.
- **Target eval(s):** ps-009 (plan realism — better batching → higher completion rate)
- **Expected delta:** ps-009: +0.05
- **Risks / counterarguments:** Batching might conflict with priority ordering (P1 first). Only batch within the same priority tier.
- **Experiment design:** Add label/link check to Step 4 shape logic. Measure ps-009 before/after over 2 weeks.
- **Result:**
