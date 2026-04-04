# Output — Agent Wiring

## Context

This workstream serves: Reflect and reshape in one flow.
Read `goal.md` in this directory for strategic direction before every session.

## Files

| File | Owner | Purpose |
|------|-------|---------|
| `goal.md` | Human | Strategic direction — read before every experiment |
| Supabase `hypotheses` | Shared | Hypothesis queue in Supabase — query for queued, update status after experiments |
| `experiment-log/` | Agent | One markdown file per experiment with before/after eval deltas |
| `../../evals.json` | Pipeline | Behavioral evals (single source of truth — NEVER copy content here) |

## Evals

Eval definitions live in `../../evals.json`. Reference them by ID only.
Do NOT paste eval targets, measurements, or scoring formulas into this file or goal.md.

This workstream's relevant eval IDs:

- eval-003

## Idea Capture (Discord Channel Messages)

When a message arrives from the Discord channel for this workstream:

1. **Acknowledge** — react or reply briefly to confirm you received the idea
2. **Identify** — treat every message as a potential idea unless it's clearly a question about the system itself
3. **Open a thread** — reply in-thread (use the reply tool with the message ID) to keep the conversation focused
4. **Tag** — the idea belongs to this workstream (the channel determines the workstream)
5. **Timestamp** — note when the idea arrived (from the message metadata)

Then immediately begin the sparring flow (below).

## Sparring Flow (Idea Enrichment)

After capturing an idea, enrich it through conversation in the thread:

1. **Read goal.md** first — understand this workstream's current strategic direction
2. **Ask 2-3 clarifying questions**, one at a time:
   - Which eval(s) would this move? (reference eval IDs from this workstream, read `../../evals.json` for details)
   - What's the expected delta? How confident are you?
   - What could go wrong? Is there a simpler version to test first?
3. **Reference goal.md direction** — frame questions in terms of the workstream's focus areas
4. **Do NOT copy eval content** into the thread — reference eval IDs only (guard-001)
5. **Keep it conversational** — short messages, one question at a time, match the builder's energy
6. **Let the builder lead** — if they want to riff, riff. If they want to move fast, move fast.

The goal: the builder leaves the conversation knowing the idea is understood correctly.

## Hypothesis Graduation

When the builder signals completion ("graduate this", "port it", "add to backlog", or similar):

1. **Synthesize** the thread into a structured hypothesis with ALL required fields:
   - Problem statement (what's wrong or suboptimal today)
   - Proposed change (what specifically to do)
   - Target eval(s) (which eval IDs, by reference)
   - Expected delta (estimated improvement on 0-1 scale)
   - Risks / counterarguments (from the sparring)
   - Experiment design (minimum viable test)
2. **Show the draft** to the builder in the thread for approval
3. **Insert** the approved hypothesis into Supabase via curl:
   ```bash
   curl -s -X POST "https://xwxsrsybllifbivhgojl.supabase.co/rest/v1/hypotheses" \
     -H "apikey: sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Authorization: Bearer sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Content-Type: application/json" \
     -d '{"product":"todolist","workstream":"output","title":"...","status":"queued","date_added":"YYYY-MM-DD","problem_statement":"...","proposed_change":"...","target_evals":"...","expected_delta":"...","confidence":"high|medium|low","risks":"...","experiment_design":"..."}'
   ```
4. **Confirm** in the thread that it's been added

If the builder doesn't explicitly graduate, the idea stays in the thread — no pressure.

## Experiment Workflow (Execution Engine)

When running experiments (scheduled heartbeat, not during capture):

1. **Read** goal.md for current direction
2. **Select** the top queued hypothesis from Supabase:
   ```bash
   curl -s "https://xwxsrsybllifbivhgojl.supabase.co/rest/v1/hypotheses?status=eq.queued&product=eq.todolist&workstream=eq.output&order=expected_delta.desc&limit=1" \
     -H "apikey: sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Authorization: Bearer sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk"
   ```
3. **Branch** into a git worktree for isolation
4. **Implement** the proposed change within adaptation boundaries
5. **Measure** run the eval suite, capture before/after deltas for this workstream's eval IDs
6. **Decide** using the decision thresholds below:
   - |eval delta| >= 0.05 and positive → merge and ship
   - |eval delta| >= 0.05 and negative → reject with learnings
   - |eval delta| < 0.05 → mark as **inconclusive** (hypothesis returns to queued for redesign)
7. **Update** all three Supabase tables and write results to experiment-log/:
   ```bash
   # a) Update hypothesis status
   curl -s -X PATCH "https://xwxsrsybllifbivhgojl.supabase.co/rest/v1/hypotheses?id=eq.<HYPOTHESIS_UUID>" \
     -H "apikey: sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Authorization: Bearer sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Content-Type: application/json" \
     -d '{"status":"shipped","result":"Description of what happened"}'

   # b) Insert experiment record
   curl -s -X POST "https://xwxsrsybllifbivhgojl.supabase.co/rest/v1/experiments" \
     -H "apikey: sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Authorization: Bearer sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     -d '{"product":"<PRODUCT>","workstream":"<WORKSTREAM>","hypothesis":"<TITLE>","status":"shipped","branch":"experiment/<workstream>/<date>-<slug>","completed_at":"<ISO_TIMESTAMP>","qualitative_description":"<SUMMARY>"}'

   # c) Insert eval deltas (one per measured eval)
   curl -s -X POST "https://xwxsrsybllifbivhgojl.supabase.co/rest/v1/eval_deltas" \
     -H "apikey: sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Authorization: Bearer sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk" \
     -H "Content-Type: application/json" \
     -d '{"experiment_id":"<EXPERIMENT_UUID>","eval_id":"<EVAL_ID>","before_score":<BEFORE>,"after_score":<AFTER>}'
   ```

## Decision Thresholds

The minimum eval delta threshold is **0.05**. This prevents ambiguous ship/reject decisions on tiny deltas.

| |eval delta| | Decision | Supabase status |
|-------------|----------|------------------|
| >= 0.05, positive | Ship (merge to main) | `shipped` |
| >= 0.05, negative | Reject (log learnings) | `rejected` |
| < 0.05 | Inconclusive (redesign the hypothesis) | `inconclusive` |

An inconclusive result means the experiment ran correctly but the signal was too weak to act on. The hypothesis stays available for redesign with a different approach.

## Adaptation Boundaries

**CAN do:**
- Split a hypothesis into smaller testable changes
- Reorder the backlog based on eval gap analysis
- Add new hypotheses discovered during experiments
- Propose new evals (via a hypothesis, not by modifying evals directly)

**CANNOT do:**
- Modify eval definitions, targets, or measurements (owned by the pipeline)
- Modify goal.md (owned by the human)
- Skip the eval measurement step
- Ship changes that regress any eval
- Touch files outside this workstream directory (except the shared evals file for reading)

## Circuit Breakers

- 3 test failures on the same error → STOP and report
- Touching >5 files in a single experiment → STOP (experiment too broad)
- Eval regression on any metric → reject the change, log learnings
