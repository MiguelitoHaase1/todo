---
title: "Behavioral Evals: Todolist"
strategy_slug: "todolist"
generated: "2026-03-26"
jtbd_coverage:
  total_now_jtbds: 5
  jtbds_with_evals: 5
  coverage: 1.0
evals:
  - id: "eval-001"
    jtbd: "Capture a task instantly"
    statement: "Michael captures 2+ tasks on each weekday via the td CLI or chat bridge"
    type: "behavioral"
    score_type: "continuous"
    target: 1.0
    baseline: null
    measurement: "weekdays_with_2plus_captures / 5"
    success_criteria: "Score of 1.0 for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "Tasks captured but land with no priority signal"
        expected_score: 0.3
      - statement: "Every new task auto-ranks above existing priorities (recency bias overshoot)"
        expected_score: 0.2
  - id: "eval-002"
    jtbd: "See the full landscape"
    statement: "When the system proposes related tasks or reframings, Michael acts on the suggestions"
    type: "behavioral"
    score_type: "continuous"
    target: 0.6
    baseline: null
    measurement: "proposals_acted_on / proposals_shown"
    success_criteria: "Score of 0.6 or higher for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "System proposes links between unrelated tasks (over-eager matching creates noise)"
        expected_score: 0.2
  - id: "eval-003"
    jtbd: "Reflect and reshape in one flow"
    statement: "After completing evening recap, Michael completes tomorrow's plan in the same session on mobile"
    type: "behavioral"
    score_type: "continuous"
    target: 0.8
    baseline: null
    measurement: "evening_sessions_with_plan_completed / evening_sessions_with_recap"
    success_criteria: "Score of 0.8 or higher for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "Recap-to-plan works when attempted but process weight causes skipped days"
        expected_score: 0.3
  - id: "eval-004"
    jtbd: "Get AI-powered priority suggestions"
    statement: "Michael engages with AI priority challenges — reprioritizing tasks or explicitly confirming after devil's advocate pushback"
    type: "behavioral"
    score_type: "continuous"
    target: 0.3
    baseline: null
    measurement: "priority_reconsiderations_engaged / ai_priority_challenges_shown"
    success_criteria: "Score of 0.3 or higher for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "Priority challenges feel like interruptions, adding ceremony to quick decisions"
        expected_score: 0.2
  - id: "eval-005"
    jtbd: "See task relationships during planning"
    statement: "Planning sessions produce relationship-driven backlog churn — merges, deletes, and resurfaced tasks"
    type: "behavioral"
    score_type: "continuous"
    target: 0.8
    baseline: null
    measurement: "min(1, relationship_driven_actions / 3) per planning session"
    success_criteria: "Score of 0.8 or higher for 2 consecutive weeks"
    grader: "code"
    quality_tier: 2
    negative_cases:
      - statement: "System suggests merges/deletes based on weak connections, creating busywork"
        expected_score: 0.2
leading_indicators:
  primary:
    - id: "li-001"
      name: "Priority concentration trend"
      jtbd_link: "Get AI-powered priority suggestions"
      score_type: "continuous"
      target: 0.7
      measurement: "this_week_p0p1_ratio >= last_week_p0p1_ratio (1 if improved or held, 0 if declined), averaged over rolling window"
      grader: "code"
      frequency: "weekly"
    - id: "li-002"
      name: "Recap momentum tone"
      jtbd_link: "Reflect and reshape in one flow"
      score_type: "continuous"
      target: 0.7
      measurement: "LLM scores each evening recap 0-1 on forward-momentum language, weekly average of daily scores"
      grader: "llm"
      frequency: "weekly"
    - id: "li-003"
      name: "Backlog hygiene activation"
      jtbd_link: "See the full landscape"
      score_type: "binary"
      target: 1.0
      measurement: "at_least_one_merge_or_delete_in_first_week (1 if yes, 0 if no)"
      grader: "code"
      frequency: "weekly"
  secondary:
    - id: "li-004"
      name: "Todoist displacement"
      jtbd_link: null
      score_type: "binary"
      target: 1.0
      measurement: "zero_todoist_task_creates_this_week (1 if zero, 0 if any)"
      grader: "code"
      frequency: "weekly"
guardrails:
  - id: "guard-001"
    source: "negative-case-pattern"
    statement: "System must never add complexity that threatens daily usage"
    fail_condition: "Daily usage drops below 4 of 5 weekdays in any given week"
    measurement: "weekdays_with_any_system_interaction / 5"
    target: 0.8
    grader: "code"
---

# Behavioral Evals: Todolist

**Strategy:** Todolist
**Generated:** 2026-03-26
**Coverage:** 5/5 Now JTBDs with evals

---

## Behavioral Evals by JTBD

### Capture a task instantly

#### eval-001: Daily capture consistency

**Statement:** Michael captures 2+ tasks on each weekday via the td CLI or chat bridge.

**Measurement:**
| Component | Value |
|-----------|-------|
| Score type | continuous |
| Formula | weekdays_with_2plus_captures / 5 |
| Target | 1.0 |
| Baseline | null (new system) |
| Grader | code (query Supabase created_at by weekday) |
| Quality tier | 2 (behavioral signal) |

**Success criteria:** Score of 1.0 for 2 consecutive weeks.

**Negative cases:**
- Tasks captured but land with no priority signal → score: 0.3
- Every new task auto-ranks above existing priorities (recency bias overshoot) → score: 0.2

**Rationale:** Frictionless capture is the foundation. If the system isn't used daily for quick task entry, nothing else matters. Consistency over volume proves the habit formed — the CLI is fast enough to reach for reflexively.

---

### See the full landscape

#### eval-002: Proposal acceptance rate

**Statement:** When the system proposes related tasks or reframings (on priority-set or task-add), Michael acts on the suggestions — merging, dropping, reframing, or accepting.

**Measurement:**
| Component | Value |
|-----------|-------|
| Score type | continuous |
| Formula | proposals_acted_on / proposals_shown |
| Target | 0.6 |
| Baseline | null (new system) |
| Grader | code (track proposal events + follow-up actions within session) |
| Quality tier | 2 (behavioral signal) |

**Success criteria:** Score of 0.6 or higher for 2 consecutive weeks.

**Negative cases:**
- System proposes links between unrelated tasks (over-eager matching creates noise) → score: 0.2

**Rationale:** A passive list doesn't prove the landscape job is done. The system must actively surface relevant tasks and propose intelligent restructuring. Acceptance rate measures whether those proposals are useful — if Michael ignores them, the landscape isn't helping him think.

---

### Reflect and reshape in one flow

#### eval-003: Recap-to-plan completion

**Statement:** After completing evening recap, Michael completes tomorrow's plan in the same session on mobile.

**Measurement:**
| Component | Value |
|-----------|-------|
| Score type | continuous |
| Formula | evening_sessions_with_plan_completed / evening_sessions_with_recap |
| Target | 0.8 |
| Baseline | null (new system) |
| Grader | code (recap event followed by plan-commit event in same session) |
| Quality tier | 2 (behavioral signal) |

**Success criteria:** Score of 0.8 or higher for 2 consecutive weeks.

**Negative cases:**
- Recap-to-plan works when attempted but process weight causes skipped days → score: 0.3

**Rationale:** The core pain point is two separate apps for one evening ritual. This eval proves the gap is closed — recap flows into reshaping without switching context. Completing on mobile proves the flow is lightweight enough to do from the couch, not just at a desk.

---

### Get AI-powered priority suggestions

#### eval-004: Priority reconsideration rate

**Statement:** Michael engages with AI priority challenges — reprioritizing tasks or explicitly confirming after devil's advocate pushback. The AI draws on the full picture: backlog, past completions, and upcoming calendar.

**Measurement:**
| Component | Value |
|-----------|-------|
| Score type | continuous |
| Formula | priority_reconsiderations_engaged / ai_priority_challenges_shown |
| Target | 0.3 |
| Baseline | null (new system) |
| Grader | code (challenge event → priority change or explicit confirm within session) |
| Quality tier | 2 (behavioral signal) |

**Success criteria:** Score of 0.3 or higher for 2 consecutive weeks.

**Negative cases:**
- Priority challenges feel like interruptions, adding ceremony to quick decisions → score: 0.2

**Rationale:** This is the highest-risk assumption in the strategy. The AI must do more than sort — it must challenge, drawing on backlog, history, and upcoming calendar. A 0.3 target is deliberately modest: mind-changing is rare by nature. If it never happens, the AI isn't adding value beyond manual sorting. The devil's advocate role ensures priorities are pressure-tested, not rubber-stamped.

---

### See task relationships during planning

#### eval-005: Relationship-driven backlog churn

**Statement:** Planning sessions produce relationship-driven backlog churn — tasks merged, deleted, or resurfaced from the deprioritized backlog because relationships made them visible.

**Measurement:**
| Component | Value |
|-----------|-------|
| Score type | continuous |
| Formula | min(1, relationship_driven_actions / 3) per planning session |
| Target | 0.8 |
| Baseline | null (new system) |
| Grader | code (track merge/delete/resurface events tagged as relationship-driven) |
| Quality tier | 2 (behavioral signal) |

**Success criteria:** Score of 0.8 or higher for 2 consecutive weeks.

**Negative cases:**
- System suggests merges/deletes based on weak connections, creating busywork → score: 0.2

**Rationale:** Relationships are only valuable if they change decisions. Three actions per session — merging duplicates, deleting covered tasks, resurfacing forgotten ones — proves the web of connections is informing planning, not just decorating a list.

---

## Leading Indicators

### Primary (JTBD-linked)

#### li-001: Priority concentration trend

**Signal:** The ratio of P0/P1 task completions to total completions improves or holds steady week over week.

| Component | Value |
|-----------|-------|
| JTBD link | Get AI-powered priority suggestions |
| Score type | continuous |
| Formula | 1 if this_week_p0p1_ratio >= last_week_p0p1_ratio, else 0 |
| Target | 0.7 |
| Grader | code (query task completions by priority per week) |
| Frequency | weekly |

**Rationale:** The system should shift attention toward high-leverage work over time. If priority concentration stalls or reverses, the AI suggestions aren't landing — you're still spreading effort across low-impact tasks.

---

#### li-002: Recap momentum tone

**Signal:** Evening recaps carry forward-momentum language ("made progress on," "cleared the way for") rather than defensive language ("didn't finish," "ran out of time").

| Component | Value |
|-----------|-------|
| JTBD link | Reflect and reshape in one flow |
| Score type | continuous |
| Formula | LLM scores each recap 0-1 on forward-momentum framing, weekly average |
| Target | 0.7 |
| Grader | LLM (rubric: proportion of items framed as progress vs. missed/deferred) |
| Frequency | weekly |

**Rationale:** Tone is a leading indicator of conviction. When recaps shift from apologetic to energized, the reflect-and-reshape flow is working — you feel like the day moved the needle, not just consumed it.

---

#### li-003: Backlog hygiene activation

**Signal:** At least one merge, delete, or resurface event happens in the first week.

| Component | Value |
|-----------|-------|
| JTBD link | See the full landscape |
| Score type | binary |
| Formula | at_least_one_merge_or_delete_in_first_week (1 if yes, 0 if no) |
| Target | 1.0 |
| Grader | code (count merge/delete/resurface events in first 7 days) |
| Frequency | weekly |

**Rationale:** The landscape only works if it drives decisions. One backlog hygiene action in week one proves the overview is surfacing things worth acting on. The behavioral eval (eval-005) measures ongoing depth — this catches whether the flywheel started at all.

---

### Secondary (system-wide)

#### li-004: Todoist displacement

**Signal:** Zero new tasks created in Todoist this week — full adoption of the Headless Brain as the primary task system.

| Component | Value |
|-----------|-------|
| JTBD link | — (system-wide adoption) |
| Score type | binary |
| Formula | zero_todoist_task_creates_this_week (1 if zero, 0 if any) |
| Target | 1.0 |
| Grader | code (Todoist API activity check) |
| Frequency | weekly |

**Rationale:** The clearest adoption signal is displacement. If you're still creating tasks in Todoist, the new system hasn't earned full trust. Binary by design — partial migration is not success.

---

## Guardrails

#### guard-001: Workflow weight ceiling

**Statement:** The system must never add complexity that threatens daily usage.

| Component | Value |
|-----------|-------|
| Source | Negative case pattern (evals 002-005 share this failure mode) |
| Fail condition | Daily usage drops below 4 of 5 weekdays in any given week |
| Formula | weekdays_with_any_system_interaction / 5 |
| Target | 0.8 (floor — trips if violated) |
| Grader | code (count days with any system event) |

**Rationale:** The single thread connecting every negative case: the system tries too hard. Over-eager proposals, heavy recap flows, interruptive priority challenges, spurious relationship suggestions — all fail because they add process weight. Daily usage frequency is the canary. If it dips below 4 of 5 weekdays, something in the system is too heavy. This guardrail overrides all other evals — a feature that scores well but kills the habit is a net negative.
