---
title: "Todolist"
vision: "A task system that thinks alongside me — surfacing what matters most each day from everything I've committed to, learned, and reflected on."
where_to_play: "Single user (Michael), CLI + mobile interface + /morning skill integration. Tasks, priorities, relationships, and context in one owned system."
principles:
  - "Landscape over directives — show the full picture, let me decide"
  - "Frictionless capture, rich context later — one-liners in, enrichment during planning"
  - "Deep integration over standalone value — composable pieces that optimize individually"
jtbd_now:
  - "Capture a task instantly"
  - "See the full landscape"
  - "Reflect and reshape in one flow"
  - "Get AI-powered priority suggestions"
  - "See task relationships during planning"
---

# Product Strategy: Todolist

**Author:** Michael Haase
**Date:** 2026-03-25
**Status:** Complete

## Discovery Context

A self-owned task management system that replaces Todoist. Built for one user — Michael — and deeply integrated with the existing /morning planning skill and Morning Brew daily operating page.

### What exists today

- **Todoist** — current task store, accessed via MCP by the /morning skill
- **/morning skill** — Chief of Staff morning briefing that synthesizes calendar + tasks + historical context into a day plan
- **Morning Brew** (morningbrew-gilt.vercel.app) — interactive HTML day page with timeline, checkboxes, notes, evening reflections, synced to Supabase
- **context.md** — persistent memory of priorities, outcomes, patterns, and reflections across days
- **Google Calendar** — schedule source and write-back target after plan approval

### Pain points with Todoist

1. **Stale backlog blindness** — Tasks pushed from previous days pile up. Important items drown alongside noise. No signal for what matters today versus what's just been deferred repeatedly.
2. **Thin task context** — Descriptions lack surrounding context. Without yesterday's reflections and learnings, calendar entries end up vague and the planning loses depth.
3. **Invisible relationships** — Tasks are deeply interlinked but treated as independent atoms. No dependency graph, no grouping. AI should surface the web of connections rather than requiring manual tagging.
4. **Rigid editing during planning** — Evening planning should be a reshaping session with heavy read/write. The current flow makes it hard to restructure tasks based on evolving priorities.
5. **Double-entry tax** — Morning Brew already captures completions and reflections via Supabase. Going back to Todoist to mirror the same state is wasted motion.
6. **Shallow rescheduling** — When tasks slide to the next day, there's no reasoning about why. Intelligence should be rooted in the full knowledge base and past experiences, not just "move to tomorrow."

### Rollout approach

Run alongside Todoist initially. Prove value incrementally. Let Todoist fall away as the new system becomes the authoritative source. Timeline: weeks, not days. Build it right, improve on a running basis.

## Scope & Vision

### Outcome statement

Michael trusts the system to surface the right tasks each day. Backlog anxiety disappears because the system is alive — it sees everything, understands relationships, and explains its reasoning. No important task gets lost. No stale item lingers without a reason.

### Product vision

A task system that thinks alongside me — surfacing what matters most each day from everything I've committed to, learned, and reflected on.

### Where to play

- **User:** Michael (single user, software-for-one)
- **Surfaces:** CLI for quick capture and planning sessions, mobile-friendly web for on-the-go browsing and reprioritization, /morning skill integration as the primary daily planning interface
- **Data:** Owned task store (SQLite or Supabase), with task relationships, context, and reflection history
- **Not building (yet):** Full dashboard app, knowledge graph, multi-user support

### Scope direction: Smart backend + lightweight mobile web

Build the intelligent task graph as a data layer with an API. Add a simple mobile-friendly web view for browsing, reprioritizing, and checking off tasks. Morning Brew stays the daily operating page. The /morning skill reads from this system instead of Todoist.

**Evolution path:** As the system accumulates context — reflections, outcomes, relationships between tasks and projects — it naturally grows toward a knowledge graph (option E). The data model should accommodate this from the start without requiring it.

## Tenets & Principles

### Facts (proven through daily use)

1. **Quick capture is essential.** Tasks arrive at random moments. They need a fast, frictionless path into the pool. (Evidence: daily practice — capture happens via phone, CLI, mid-conversation.)
2. **Evening planning is reshaping, not listing.** The core activity is trimming and restructuring tomorrow's plan against the existing backlog. (Evidence: every /morning session involves heavy reprioritization.)
3. **Priority tiers work.** P1/P2/P3 creates enough granularity to signal what matters without over-engineering. (Evidence: Todoist priorities are the one feature that consistently helps.)
4. **Morning Brew already captures completions and reflections.** Supabase sync tracks checkbox state, skip state, and evening reflections. This data exists but flows nowhere. (Evidence: morningbrew-gilt.vercel.app with Supabase backend.)

### Assumptions (need validation)

1. **Linked tasks will change how I think about work.** Seeing relationships between tasks will make planning more malleable — less rigid lists, more fluid prioritization. (Confidence: medium. Impact if wrong: medium — system still works, just less differentiated.)
2. **AI can surface better priorities than manual sorting.** Given enough context (reflections, outcomes, relationships), AI prioritization will beat gut-feel ordering. (Confidence: medium. Impact if wrong: high — this is the core value proposition.)
3. **Context enrichment fits naturally in the evening planning ritual.** Thin tasks captured during the day can be enriched when planning tomorrow — without making the ritual feel like homework. (Confidence: high. Impact if wrong: medium — could enrich at other times.)

### Beliefs (strategic commitments)

1. **Todoist's invisible quality is a real risk.** Enterprise-grade software handles corner cases you don't notice until they break — recurring tasks, timezone handling, offline sync, notification timing, date parsing. We commit to discovering these gaps incrementally rather than trying to match Todoist on day one. Running in parallel is the mitigation strategy.
2. **Single-user software can be better than general-purpose tools.** A system built for exactly one person's workflow will outperform a tool designed for millions, because every decision can be tuned precisely. No compromises for other users.
3. **The data model matters more than the UI.** If the backend captures relationships, context, and history correctly, any UI can be built on top. The reverse is not true.

### Even Over Principles

1. **Landscape over directives** — Show me the full picture and let me decide, even over telling me what to do. The system is an advisor, not a boss.
2. **Frictionless capture over rich input** — One-liners in, even over detailed descriptions. Enrich later during the evening planning ritual.
3. **Deep integration over standalone value** — Optimize for the /morning + Morning Brew workflow, even over being useful in isolation. But keep pieces composable so each can improve independently.

## Section 1: Problem & Users

### Who

Michael Haase. Single user. Product manager who vibes code, builds with AI, and runs a daily planning ritual through the /morning skill and Morning Brew.

### Where to play (user segment framing)

A knowledge worker who treats productivity as a system — not just a list. Tasks flow from meetings, car rides, meditation, conversations, and late-night thoughts. They're managed through a morning planning ritual, an interactive daily page, and evening reflections. The tool must serve all three moments.

### The broken middle

Tasks enter the world all day long. They're captured fast — one-liners into Todoist. But then they disappear into a flat list organized only by due date. The next time they surface is when they're "due" — but due dates are just a proxy for "when I'll look at this," not real deadlines. Tasks that don't land on today's date are invisible.

The evening is where the system breaks. The Morning Brew reflection (gratitude, learnings, priorities) happens in one app. Updating tasks — checking off completions, deferring work, planning tomorrow — happens in Todoist. Two separate motions that should be one conversation.

The result: a backlog that grows stale, tasks with thin context, no visible relationships between related work, and a nightly chore that feels deflating rather than energizing.

## Section 2: User Experience — Jobs To Be Done

### The daily rhythm

Three task moments define the day:
1. **Anytime** — capture on the run
2. **Evening** — reflect on today, reshape tomorrow
3. **Morning** — synthesize into a day plan (via /morning skill)

### Now: V1 Jobs

**JTBD 1: Capture a task instantly**
- *When* a thought hits — in a meeting, in the car, falling asleep
- *I want to* get it into the system in seconds
- *So I can* trust nothing gets lost and return to what I was doing

| Dimension | Description |
|-----------|-------------|
| Functional | Task created with title, optional priority, in under 5 seconds |
| Emotional | Relief — "it's captured, I can let go" |
| Social | N/A (single user) |

**JTBD 2: See the full landscape**
- *When* sitting down to plan (evening or morning)
- *I want to* see everything in one view — priorities, relationships, staleness, groupings
- *So I can* make informed decisions about what matters instead of scanning a flat list

| Dimension | Description |
|-----------|-------------|
| Functional | All tasks visible with priority, age, relationships, and groupings |
| Emotional | Confidence — "I see the whole picture, nothing is hiding" |
| Social | N/A |

**JTBD 3: Reflect and reshape in one flow**
- *When* reviewing my day in the evening (Morning Brew reflections)
- *I want to* naturally flow from reflection into reshaping tomorrow's tasks
- *So I can* close out today and set up tomorrow in one motion, not two apps

| Dimension | Description |
|-----------|-------------|
| Functional | Evening reflections inform task updates — completions sync, deferrals happen in place, tomorrow's plan takes shape |
| Emotional | Gratifying — "reflecting on my day naturally builds tomorrow's plan" |
| Social | N/A |

**JTBD 4: Get AI-powered priority suggestions**
- *When* planning tomorrow
- *I want to* see what the system thinks matters most, based on context, reflections, relationships, and patterns
- *So I can* focus on the right things without manually sorting through everything

| Dimension | Description |
|-----------|-------------|
| Functional | AI ranks tasks by relevance to current priorities, considering history, reflections, and relationships |
| Emotional | Trust — "the system sees patterns I miss" |
| Social | N/A |

**JTBD 5: See task relationships during planning**
- *When* reflecting and reshaping in the evening
- *I want to* see how tasks connect — grouped work, dependencies, related threads
- *So I can* think more fluidly about what to tackle together or sequence

| Dimension | Description |
|-----------|-------------|
| Functional | Tasks display their links — parent/child, related, blocking/blocked-by |
| Emotional | Clarity — "I understand the web of my work, not just isolated items" |
| Social | N/A |

### Later: Extension Jobs

**JTBD 6: Track task history and evolution** — When a task has been deferred five times, understand why. See its full history — when created, how many times moved, what reflections mentioned it. This builds the foundation for the knowledge graph evolution path.

**JTBD 7: Browse and reprioritize on mobile** — Quick scan and adjust on the go, without the full planning ritual. A lightweight mobile web view for between-meetings moments.

### Never: Explicit no-gos

**JTBD 8: Auto-detect stale and abandoned tasks** — Automatic archiving violates "landscape over directives." The system makes staleness visible; the user decides what to do about it. The AI can *suggest* but never *act* on stale tasks autonomously.

## Appendix I: Decision Log

| Date | Decision | Alternatives | Rationale |
|------|----------|-------------|-----------|
| 2026-03-25 | Scope: Smart backend + lightweight mobile web | (A) Backend only, (C) Full app, (D) AI-first conversational, (E) Knowledge graph | Backend is the core value. Mobile web fills the on-the-go gap. Morning Brew stays the daily page. Keeps scope buildable in weeks while evolving toward knowledge graph. |
| 2026-03-25 | Task relationships in V1, not Later | Defer to later release | Relationships are part of the evening reflection flow, not a separate feature. Seeing connected tasks changes how you reshape tomorrow. |
| 2026-03-25 | Run alongside Todoist, not replace immediately | Big-bang switch | Todoist's invisible quality (recurring tasks, timezone handling, date parsing) is a real risk. Parallel running discovers gaps incrementally. |
| 2026-03-25 | Never: auto-detect stale tasks | Auto-archive after N days | Violates "landscape over directives." The system shows staleness; the user acts. |

## Appendix II: FAQ

**Why build this instead of just using Todoist better?**
The problem isn't Todoist's features — it's the architecture. Todoist is a standalone list. It can't participate in the evening reflection, can't see task relationships, can't learn from patterns. The /morning skill and Morning Brew need a task backend that's part of the conversation, not a separate silo.

**Why single-user? Isn't that limiting?**
It's the opposite. A system built for one person has zero compromise. Every decision — data model, UI, priorities algorithm — is tuned to one workflow. General-purpose tools serve everyone adequately. This serves one person precisely.

**What if AI prioritization isn't better than manual sorting?**
This is the highest-risk assumption (medium confidence, high impact). The mitigation: "landscape over directives." The AI suggests, the user decides. Even if AI suggestions are mediocre, the landscape view — relationships, staleness, groupings — is independently valuable.

**What if you miss Todoist features you didn't know you needed?**
Parallel running is the explicit mitigation. Run both systems for weeks. When something breaks, add it. The belief is that most of Todoist's invisible quality (recurring tasks, reminders, natural language dates) can be built incrementally, and some of it (multi-device sync, sharing) isn't needed for single-user.

**Why not start with the knowledge graph (option E)?**
The knowledge graph is the destination, not the starting point. You need a critical mass of tasks, reflections, outcomes, and relationships before a graph becomes useful. V1 builds the data foundation. The model should accommodate graph evolution, but forcing it upfront adds complexity without immediate value.

## Appendix III: Assumptions and Beliefs

### Facts
1. Quick capture is essential (daily practice proves this)
2. Evening planning is reshaping, not listing (every /morning session confirms)
3. Priority tiers (P1/P2/P3) work (Todoist's most useful feature)
4. Morning Brew already captures completions and reflections (Supabase sync is live)

### Assumptions (to validate)
1. Linked tasks change how I think about work (medium confidence, medium impact)
2. AI can surface better priorities than manual sorting (medium confidence, high impact)
3. Context enrichment fits in the evening ritual (high confidence, medium impact)

### Beliefs (committed)
1. Todoist's invisible quality is a real risk — mitigated by parallel running
2. Single-user software can beat general-purpose tools
3. The data model matters more than the UI
