---
title: "Todolist — Archetype Selection"
source_strategy: "strategy.md"
generated: "2026-03-26"
status: "Complete"
selected_archetype: "Headless Brain"
how_to_win: "A CLI-first task backend on Supabase that Claude Code and agents can read/write natively — no frontend needed because any UI can be generated on demand."
architecture:
  frontend: "None (CLI output, on-demand generated views via skills)"
  backend: "Supabase (Postgres + REST API + auth)"
  integrations:
    - "Claude Code (via CLI/Bash)"
    - "/morning skill (via CLI/Bash, later MCP)"
    - "iMessage or Discord (chat bridge for mobile capture)"
    - "Morning Brew (Supabase — shared instance)"
    - "Google Calendar (existing /morning integration)"
  data: "Supabase Postgres — shared instance with Morning Brew"
boundaries:
  no_gos:
    - "No web frontend in V1 — generate views on demand via skills"
    - "No MCP server in V1 — CLI-via-Bash is sufficient until AI reasoning hits friction"
    - "No multi-user support — single user, single workflow"
    - "No auto-archiving of stale tasks — violates landscape-over-directives"
    - "No Taskwarrior codebase fork — borrow concepts only"
    - "No notification system — Morning Brew is the notification"
    - "No natural language date parsing in V1 — use explicit dates, add NLP later"
  rabbit_holes:
    - trap: "Rebuilding Taskwarrior's recurrence engine"
      avoidance: "Start with simple repeat rules (daily, weekly). Add complex RRULE support only when you miss it from Todoist."
    - trap: "Over-engineering the relationship model"
      avoidance: "Start with two link types: parent/child and related. Add blocking/blocked-by only if planning needs it."
    - trap: "Building a full iMessage bot framework"
      avoidance: "Use the simplest possible bridge — a Claude Code channel via Discord or Shortcuts. Not a custom iMessage app."
    - trap: "Premature AI prioritization algorithm"
      avoidance: "Start with simple urgency scoring (Taskwarrior-style: age + priority + due date). Add AI reasoning via /morning skill, not built into the CLI."
  constraints:
    - "Must run alongside Todoist during transition — no big-bang switch"
    - "Must be accessible from Claude Code on any machine (Supabase, not local files)"
    - "Must produce JSON output for all commands (machine-readable for agents)"
    - "Must integrate with existing Morning Brew Supabase instance"
    - "CLI must work in under 5 seconds for capture (frictionless-capture principle)"
jtbd_mapping:
  - jtbd: "Capture a task instantly"
    addressed_by: "CLI `td add` command from terminal. iMessage/Discord bridge from phone. Both hit Supabase directly."
    fit: "strong"
  - jtbd: "See the full landscape"
    addressed_by: "CLI `td list` with filters, grouping, and relationship display. JSON output for skill-generated views. No persistent dashboard."
    fit: "partial"
  - jtbd: "Reflect and reshape in one flow"
    addressed_by: "/morning skill reads tasks via CLI, reshapes tomorrow's plan, writes updates back. Evening reflections in Morning Brew flow into task updates."
    fit: "strong"
  - jtbd: "Get AI-powered priority suggestions"
    addressed_by: "The /morning skill has full task graph access via CLI JSON output. It reasons about priorities using context.md + reflections + task relationships. AI lives in the skill, not the CLI."
    fit: "strong"
  - jtbd: "See task relationships during planning"
    addressed_by: "CLI shows task links (parent/child, related). `td show 42` displays related tasks. /morning skill uses this for context-aware planning."
    fit: "strong"
alternatives:
  - name: "CLI + MCP + Web (Direction 8)"
    reason_not_selected: "Over-scoped for V1. MCP and web are Later — build them when CLI-via-Bash hits limits."
  - name: "Taskwarrior Fork + AI Layer (Direction 2)"
    reason_not_selected: "C++ codebase is a liability. Borrow concepts, don't fork code."
  - name: "Full Web App + API (Direction 7)"
    reason_not_selected: "Most infrastructure to build. The strategy says data model matters more than UI."
deployed_url: null
---

# Archetype Selection: Todolist

**Source:** strategy.md
**Generated:** 2026-03-26
**Status:** Complete

---

## 1. Boundaries

### No-Gos

- **No web frontend in V1** — Generate views on demand via skills. The strategy says "data model matters more than UI."
- **No MCP server in V1** — CLI-via-Bash gives Claude Code and agents full access. Add MCP when AI reasoning needs richer structured access.
- **No multi-user support** — Single-user software built for one workflow. No compromises.
- **No auto-archiving** — Violates "landscape over directives." Show staleness, let the user decide.
- **No Taskwarrior code fork** — Borrow the 20% of concepts that matter. Build in TypeScript on Supabase.
- **No notification system** — Morning Brew IS the daily notification. No push alerts, no reminders.

### Rabbit Holes

- **Recurrence engine:** Taskwarrior's RRULE support is complex. Start with daily/weekly/monthly. Add complexity only when you miss it from Todoist.
- **Relationship model:** Two link types in V1: parent/child and related. Don't build a full graph database. Add blocking/blocked-by if planning needs it.
- **iMessage bot:** Use the simplest possible bridge — a Discord bot or Apple Shortcuts + CLI. Not a custom iMessage framework.
- **AI prioritization algorithm:** Don't build a scoring engine into the CLI. The /morning skill IS the AI layer. The CLI provides data; the skill provides intelligence.

### Constraints

- Must run alongside Todoist during transition
- Must be accessible from any machine (Supabase, not local files)
- Must produce JSON output for all commands (agents need machine-readable data)
- Must share Supabase instance with Morning Brew
- CLI capture must complete in under 5 seconds

---

## 2. Proposed Approach

### Headless Brain

**How to win:** A CLI-first task backend on Supabase that Claude Code and agents can read/write natively — no frontend needed because any UI can be generated on demand.

**Core idea:** Build a TypeScript CLI tool (`td`) backed by Supabase Postgres. The CLI handles capture, browse, update, and relationship management. Agents (the /morning skill, Claude Code) interact via Bash + JSON output. Mobile capture via iMessage/Discord bridge. No frontend, no MCP server — both are composable additions for later.

**Architecture:**
- **Frontend:** None. CLI output + on-demand generated views via skills.
- **Backend:** Supabase Postgres — shared instance with Morning Brew. REST API for the CLI.
- **Integrations:** Claude Code (Bash), /morning skill (Bash), iMessage/Discord (chat bridge), Morning Brew (shared Supabase), Google Calendar (existing).
- **Data:** Supabase Postgres. Tables for tasks, relationships, context links. Shared instance means Morning Brew reflections can reference tasks directly.

**Taskwarrior concepts to steal:**
1. **Priority tiers** — P1/P2/P3 urgency levels
2. **Dependencies** — parent/child and related link types
3. **Urgency scoring** — simple formula: age + priority + due proximity
4. **JSON export** — every command outputs structured JSON with `--json` flag
5. **Hooks** — extensibility points for AI enrichment (pre-add, post-complete, etc.)

### Build Sequence

```
Phase 1: Supabase schema + CLI core (td add, td list, td done, td show)
Phase 2: Task relationships (td link, td unlink, related display)
Phase 3: iMessage/Discord bridge for mobile capture
Phase 4: /morning skill integration (replace Todoist MCP calls with td CLI)
--- V1 complete, run alongside Todoist ---
Phase 5: MCP server (when AI reasoning needs richer access)
Phase 6: Web frontend (generated on demand or persistent)
```

### JTBD Coverage

| Job | Fit | How Addressed |
|-----|-----|---------------|
| Capture a task instantly | Strong | `td add "Buy milk" -p2` from terminal. Chat bridge from phone. Under 5 seconds. |
| See the full landscape | Partial | `td list --all --json` with filters and groupings. No persistent dashboard — generate views via skills when needed. |
| Reflect and reshape in one flow | Strong | /morning skill reads/writes tasks via CLI. Evening reflections in Morning Brew trigger task updates in same Supabase instance. |
| AI-powered priority suggestions | Strong | /morning skill has full task graph via `td list --json`. It reasons using context.md + reflections + relationships. AI in the skill, data in the CLI. |
| Task relationships during planning | Strong | `td show 42` displays linked tasks. `td list --related 42` shows the cluster. /morning skill uses this for context-aware planning. |

### Key Trade-offs

- **No persistent visual dashboard** vs. maximum simplicity and composability. Mitigated by on-demand view generation.
- **CLI-only capture from desktop** vs. phone-native capture. Mitigated by chat bridge.
- **No MCP in V1** vs. structured AI tool access. Mitigated by JSON output — Claude parses it fine via Bash.

### Why Not the Others

- **CLI + MCP + Web:** Over-scoped for V1. Each piece is a Later addition, not a starting requirement.
- **Taskwarrior Fork:** C++ codebase makes customization painful. The concepts are what matter, not the code.
- **Full Web App:** Most infrastructure. Inverts the strategy's priority — data model first, UI second.
- **MCP-Only:** No standalone capture. Can't add a task without an AI session running.
- **Morning Brew Extension:** Tightly coupled. Can't capture outside Morning Brew.

---

## Appendix I: FAQ

### Desirability

**Q: Will a CLI-only tool actually replace Todoist's mobile experience?**
A: Not directly. The chat bridge (iMessage/Discord) is the mobile capture surface. For browsing, you generate views on demand. This is a deliberate trade — you lose Todoist's polished mobile app but gain a system that participates in your planning workflow. The bet: integration value > standalone UI value.

**Q: What if JSON output isn't rich enough for AI reasoning?**
A: This is the trigger for Phase 5 (MCP server). When the /morning skill needs to reason across 50 tasks with relationships and reflections in one call, Bash + JSON piping will feel clunky. That's when MCP earns its keep. Not before.

**Q: Why not build the web frontend from day one?**
A: "Data model matters more than UI" (strategy belief #3). If the schema and CLI are right, a frontend can be generated in a session. The reverse isn't true — a pretty UI over a bad data model is worse than no UI at all.

### Feasibility

**Q: Can Supabase handle the task relationship model?**
A: Yes. Postgres is excellent for this. A `task_links` junction table with `source_id`, `target_id`, and `link_type` gives you parent/child, related, and blocking relationships. Supabase's REST API exposes this with standard joins.

**Q: How does the chat bridge work?**
A: Simplest path: a Discord bot that runs the `td` CLI on a server and returns results. Or Apple Shortcuts that SSH into a machine and run `td add`. Not a custom messaging framework — just a thin shell around the CLI.

**Q: What Todoist features will you miss first?**
A: Probably recurring tasks and natural language date parsing. These are rabbit holes in the boundary list — start simple, add when the parallel-run period reveals the gap.

### Viability

**Q: What's the ongoing cost?**
A: Supabase free tier covers a single-user task system easily. CLI is a local binary. No hosting costs until you add a web frontend.

**Q: What if you never build the MCP or web frontend?**
A: That's fine. The CLI + chat bridge might be enough forever. The composable architecture means each addition is optional, not required.

---

## Appendix II: Solution Alternatives

### Candidate 1: CLI + MCP + Web (Direction 8)

**Core idea:** Three surfaces (CLI, MCP server, web view) sharing one Supabase brain. Maximum coverage.
**Architecture:** TypeScript CLI + MCP server + Next.js web app + Supabase
**JTBD coverage:** Strong on all 5 jobs
**Key differentiator:** Full coverage of every surface
**Trade-offs:** Most pieces to build and maintain
**Why not selected:** Over-scoped for V1. Each piece can be added later without rearchitecting.

### Candidate 2: Taskwarrior Fork + AI Layer (Direction 2)

**Core idea:** Use Taskwarrior as the battle-tested task engine. Wrap with MCP + AI layer.
**Architecture:** C++ (Taskwarrior) + TypeScript MCP wrapper + Supabase sync layer
**JTBD coverage:** Strong on capture and relationships. Partial on AI and reflect/reshape.
**Key differentiator:** Proven CLI with 15+ years of development
**Trade-offs:** C++ complexity. Hard to customize data model. Storage layer replacement needed.
**Why not selected:** The codebase is a liability. Building from scratch with Taskwarrior's concepts is faster and more flexible.

### Candidate 3: Headless Brain (Selected)

**Core idea:** Supabase brain + CLI-first + chat bridge. No frontend, no MCP. Composable additions later.
**Architecture:** TypeScript CLI + Supabase Postgres + Discord/iMessage bridge
**JTBD coverage:** Strong on 4/5 jobs. Partial on landscape (no persistent dashboard).
**Key differentiator:** Simplest possible V1 that addresses the core workflow. Every future addition is optional.
**Trade-offs:** No persistent visual dashboard. No structured MCP access for AI. Both are deliberate deferrals.
**Why selected:** Matches all three principles — frictionless capture, deep integration, composable design. Lowest complexity path to replacing Todoist.
