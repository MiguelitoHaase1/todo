# Know Michael — Context Map for Task Interactions

This is a pointer map, not a knowledge base. It tells you WHERE to look when you need context about Michael's priorities, daily rhythms, and decision-making. Read the source files directly — never cache or duplicate their content.

**Rule: silent reads.** Never tell Michael you're reading context files. The intelligence shows up in your responses, not in announcements.

---

## Daily Time Architecture

These are stable patterns. Use them for every task interaction involving time.

| Block | Time | Rule |
|-------|------|------|
| Family morning | 06:30–07:30 | Sacred. Never schedule tasks. |
| Kid drop-off (Mon/Wed/Fri) | 07:00–09:00 | Unavailable (Aflever). |
| Deep work | 09:00–12:00 | Primary window. High-priority tasks here. |
| Lunch/buffer | 12:00–13:00 | Flexible. |
| Afternoon work | 13:00–17:00 | Meetings, moderate tasks, errands. |
| Family time | 17:00–19:30 | Protected. No tasks. |
| Evening window | 19:30–22:00 | Lighter tasks, learning, exercise. |
| Swimming (Tuesday) | 20:00 | Fixed weekly. Birkerod Svommehal. |

## Priority Semantics

What P0–P4 actually means in Michael's world:

| Priority | Meaning | Examples |
|----------|---------|----------|
| P0 | Drop everything. Crisis. | Kid emergency, production down |
| P1 | Must happen today/tomorrow. Time-sensitive. | Deadline deliverables, career-critical |
| P2 | Important this week. Advances active projects. | Feature work, investor prep |
| P3 | Default. Normal tasks. Can slide. | Errands, follow-ups, reading |
| P4 | Backlog. Nice-to-have. First to triage/drop. | "Someday" ideas, low-impact cleanup |

Cross-system mapping (Supabase P0-P4 to /morning planning scale 4-1): P0=4(urgent), P1=3(high), P2=2(medium), P3=1(normal), P4=1(normal).

---

## Tier 1 — Read Per Session

These sources change daily. Read them at the start of each day (detect date change) and when making any prioritization or triage decision.

### A. Daily Priorities and Patterns

**Path:** `/Users/michaelhaase/AI/Me/Productivity/chief-of-staff/context/context.md`

Read these sections:
- `## Priorities` (last 3–5 entries) — What has Michael been focused on? Is there a thread?
- `## Task Outcomes` (latest entry) — What got done, deferred, or dropped?
- `## Patterns` — Recurring themes, `[user-feedback]` entries with scheduling preferences

**When:** Before triage. Before suggesting priority for ambiguous tasks. When Michael asks "what should I work on" or "what's important."

**Extract:** Current priority thread, deferred task patterns, explicit scheduling constraints.

### B. Identity and Contacts

**Path:** `/Users/michaelhaase/AI/Me/CLAUDE.md`

**When:** When a task mentions a person's name (check if known contact). When prioritizing work tasks (understand current role: VP Product at Jabra). When communication preferences matter.

### C. Communication Voice

**Path:** `/Users/michaelhaase/AI/Tools_AI/Writing style.md`

**When:** Read once per session, apply to ALL replies. Especially iMessage — these are phone notifications.

**Rules:** Short sentences. Simple words. Concrete. Active voice. Cut "very", "really", "basically". Lead with the point. One idea per sentence. No corporate language.

---

## Tier 2 — Read for Prioritization Decisions

These are heavier reads. Consult only when making judgment calls that need deeper understanding.

### D. Decision Frameworks

**Path:** `/Users/michaelhaase/AI/Me/Beliefs/` (18 files)

Don't read all 18. Match the task context to the relevant framework:
- Customer/market tasks: `Jobs To Be Done.md`, `Customer Discovery Principles.md`, `Market Strategy.md`
- Strategy tasks: `Strategic Kernel.md`, `Adaptive Strategy.md`, `First Principle Thinking.md`
- Team/people tasks: `Radical Candor.md`, `Trust as Vulnerability.md`
- Execution tasks: `Execution Rhythm.md`, `Outcome Over Output.md`, `DORA Metrics.md`
- Product tasks: `Product Management Power Law.md`, `Scientist vs Factory Manager Mindset.md`, `The Scientific Method for Products.md`
- Growth tasks: `10X Thinking.md`, `Build vs Buy Decision.md`

**When:** When Michael asks for help thinking through a task's importance. When triaging and you need to reason about outcomes vs. outputs. When a task description references a framework.

### E. Life Context

**Path:** `/Users/michaelhaase/AI/Me/GPT_Memory/` (11 files)

Match to the domain:
- Career tasks: `Professional Journey.md` (McKinsey, Plant Jammer, Novo Nordisk, Jabra)
- Family/personal tasks: `Personal Life.md` (kids Aya ~6, Anton ~4; Denmark; languages)
- Team tasks: `Team Management Approach.md`, `Leadership Philosophy.md`
- Technical tasks: `Technical Architecture & Platform Strategy.md`
- Health/medical: `Digital Health Experience.md`

**When:** When a task touches a specific life domain and you need background.

### F. Active Projects

**Path:** `/Users/michaelhaase/AI/Me/ProjectsImbuilding.md`

**When:** When a new task might relate to an existing project. During triage, to understand if a task advances a known project or is a new commitment.

---

## Tier 3 — Reference Only

### G. Morning/Evening Workflow

- `/Users/michaelhaase/AI/Me/Productivity/chief-of-staff/skills/morning.md`
- `/Users/michaelhaase/AI/Me/Productivity/chief-of-staff/skills/evening.md`

**When:** Only if Michael asks about how /morning or /evening works.

### H. Exercise Routine

- `/Users/michaelhaase/AI/Me/Exercise/history.md`

**When:** When tasks involve exercise scheduling or time conflicts with workout blocks.

---

## Interaction Lookup Rules

### iMessage task capture

1. Parse title/priority/date per CLAUDE.md rules (unchanged)
2. If no priority specified and task is ambiguous: read `context.md ## Priorities` (last entry). If task relates to today's priority thread, suggest P2. If unrelated and not time-sensitive, keep P3.
3. If task mentions a person name: check `Me/CLAUDE.md` for known contacts
4. Reply in Hemingway voice. Short. Concrete. No fluff.

### Triage

1. Read `context.md ## Priorities` (last 3–5 entries) and `## Task Outcomes`
2. Read `ProjectsImbuilding.md` for active project context
3. When recommending drop/defer/keep, reason about: Does this task advance the current priority thread? Has it been deferred multiple times? Is it tied to an active project?
4. Provide reasoning, not just the list. Example: "Deferred 3x, doesn't connect to active projects — recommend drop."

### "What should I work on?" / "What's important?"

1. Full Tier 1 read (context.md + CLAUDE.md)
2. Cross-reference today's tasks with priority thread
3. Present: what aligns with the thread, what's urgent regardless, what can wait

### Deep prioritization help

1. Full Tier 1 + relevant Tier 2 sources
2. Apply Michael's own frameworks to reason about the task
3. Present in his preferred style: conclusion first, then supporting points

---

## Guardrails

- **No duplication.** This file is a map. If you're writing content from source files here, stop.
- **Proportional depth.** Simple capture = zero reads. Triage = Tier 1. Deep help = Tier 1 + 2.
- **No proactive advice.** "Buy milk p2" gets a confirmation, not a strategy lecture.
- **Stale data awareness.** context.md updates daily. Beliefs/ and GPT_Memory/ change rarely. Trust recency accordingly.
- **Hemingway always.** Every iMessage reply: short sentences, concrete, active voice.
