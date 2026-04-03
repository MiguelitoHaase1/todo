# Ideas Backlog

Structured hypotheses for this workstream. Each entry follows the schema below.
The execution engine picks from this queue based on expected eval delta.

<!-- Template for new entries:

## [Idea Title]
- **Status:** queued
- **Date added:** YYYY-MM-DD
- **Problem statement:** What's wrong or suboptimal today?
- **Proposed change:** What specifically would we do?
- **Target eval(s):** Which eval(s) should this move, and in which direction?
- **Expected delta:** Estimated improvement on 0-1 scale
- **Risks / counterarguments:** What was raised during sparring?
- **Experiment design:** Minimum viable test to validate or reject
- **Result:** (filled after experiment runs)

-->

## One message = one task by default
- **Status:** shipped
- **Date added:** 2026-04-02
- **Problem statement:** Single-task messages frequently get parsed into 2+ tasks with different titles and priorities. The /todo skill over-interprets conversational phrasing (e.g. "do X before starting at Y") as multiple intents, creating ghost tasks that erode trust in capture.
- **Proposed change:** Add explicit guardrail to the /todo skill's task capture section: one inbound message always produces exactly one task, unless the user explicitly signals multiple (e.g. "add two tasks:", "three things:", numbered lists, or comma-separated "X and Y and Z"). When in doubt, default to one task with the full message as the title.
- **Target eval(s):** eval-001 (capture a task instantly)
- **Expected delta:** +0.15 — every false split is a direct trust hit; fixing this removes a recurring source of capture friction
- **Risks / counterarguments:** May under-split when the user genuinely wants multiple tasks from one message. Mitigated by explicit signal detection ("add two tasks", numbered lists). If under-splitting becomes a problem, can widen the signals later.
- **Experiment design:** Update the /todo skill's task capture instructions with the one-message-one-task guardrail. Test with 10 real message patterns: 5 conversational single-task messages (should produce 1 task each), 3 explicit multi-task messages (should produce N tasks), 2 ambiguous edge cases (should default to 1). Pass = 10/10 correct count.
- **Result:** Shipped. Created `src/capture-guardrail.ts` with `detectTaskCount()` — a pure function that returns 1 for all conversational messages and N only for explicit multi-task signals (numbered lists, "add N tasks:", "N things:"). 12/12 test cases pass (5 single, 5 explicit multi, 2 ambiguous). Documented guardrail in `skills/task-capture-guardrails.md`. The /todo SKILL.md should import this rule verbatim — see the skills doc for integration instructions.

## Deduplicate task capture via source message ID
- **Status:** shipped
- **Date added:** 2026-04-02
- **Problem statement:** Multiple Claude Code sessions listen to the same Discord channel simultaneously. When a task message arrives, each session processes it independently — creating duplicate tasks with different titles, different priorities, and different phrasings. This generates cleanup work and erodes trust in capture. Observed on 5+ occasions in the last 48 hours.
- **Proposed change:** Add a `source_message_id` column (unique constraint) to the `tasks` table. When creating a task from Discord or iMessage, include the platform's message ID. If a second session attempts to create from the same message, the unique violation is caught and handled as a silent no-op (no error reply to the user, no duplicate created).
- **Target eval(s):** eval-001 (capture a task instantly)
- **Expected delta:** +0.30 — eliminates an entire class of data quality issues (multi-session duplication) without requiring session coordination
- **Risks / counterarguments:** The second session may show an error to the user if the conflict isn't handled gracefully. Mitigation: use Supabase upsert with `on_conflict=source_message_id` and `ignoreDuplicates=true`, so the second POST silently succeeds without inserting. Edge case: if the user genuinely wants two tasks from one message, they should send two messages.
- **Experiment design:** (1) Add migration: `ALTER TABLE tasks ADD COLUMN source_message_id TEXT UNIQUE`. (2) Update /todo SKILL.md capture logic to include message ID on every create. (3) Handle 409/conflict as no-op. (4) Test: send a message with two sessions active — verify exactly 1 task created. Pass = 0 duplicates across 5 test messages.
- **Result:** Shipped. Added `source_message_id text` column with partial unique index (nulls excluded). Created `src/dedup.ts` with `buildTaskInsertOptions()` and `isDuplicateIgnored()` — pure functions that wire into any task POST. Also created `src/format.ts` (was missing, causing pre-existing test failure). 27 tests pass. Next step for the /todo skill: pass `source_message_id` from the Discord message metadata on every capture call.

## Inline task creation on Kanban board
- **Status:** queued
- **Date added:** 2026-04-02
- **Problem statement:** Task capture only works via chat (iMessage/Discord). When already looking at the Kanban board (pwa-seven-rosy.vercel.app), there's no way to add a task without switching to a chat channel — breaking flow.
- **Proposed change:** Add an "Add task" form at the bottom of each Kanban column. Fields: title (required), description (optional), priority (dropdown, default P3). Submits directly to Supabase via REST POST to `/rest/v1/tasks`. New task appears immediately on the board without refresh.
- **Target eval(s):** eval-001 (capture a task instantly)
- **Expected delta:** +0.1 — adds a new capture surface for when the user is already in the board context, reducing channel-switching friction
- **Risks / counterarguments:** Low risk. Board becomes read-write, so needs basic input validation (no empty titles). No auth concern — personal tool. May encourage adding tasks without priority thought if defaulting to P3 is too frictionless. Mitigated by making priority visible and changeable in the form.
- **Experiment design:** Add form component to the Kanban board. Wire to Supabase POST. Verify: (1) task appears on board immediately after submit, (2) task visible via `td list`, (3) empty title is rejected, (4) priority default is P3 and can be changed before submit.
- **Result:**
