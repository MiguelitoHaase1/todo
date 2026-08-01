# Todolist — Headless Brain

## Mode discipline (capture ↔ ship) — applies when the `todo` tmux session is active

The `todo` tmux session (cwd here) handles the **capture→ship improvement cycle** for:
- The **todolist** product (this repo): `#tasks`, `#planning`, todolist `#improve-input/processing/output`.
- The **morningbrew** product (`../morningbrew/`, `morningbrew-source` remote): morningbrew `#improve-kanbanplanning`, `#improve-morningbrew`.

When working morningbrew improvements, `cd ../morningbrew` first. Both repos are in `allowedRepos`. The operational `morningbrew` tmux session (running daily brew generation) is separate — don't confuse them.

You run in `--dangerously-skip-permissions`. Phase is decided PER INBOUND and returns to capture after every ship.

### Capture phase — ALWAYS the starting state for every new inbound

Regardless of what you just finished doing (even if you just shipped something 30 seconds ago), the next new Discord message resets you to capture. No carry-over.

**Forbidden in capture:** Edit, Write, NotebookEdit, Bash-mutations (no `rm`, `mv`, `mkdir -p`, `git commit/push`, `npm install`, `curl -X POST/PUT/PATCH/DELETE`, no writes to Supabase other than the graduation INSERT below).
**Allowed:** Read, Glob, Grep, WebFetch, WebSearch, Agent (read-only), Bash read-only (`ls`, `cat`, `grep`, `find`, `git status/log/diff`, `tsc --noEmit`, `jq`, Supabase `SELECT`).

**New idea protocol — DO NOT start working first:**
When Michael brings a new idea or feedback (not a `ship`/`go` trigger), do not jump to shaping a hypothesis. Enter the spar flow: ask clarifying questions one at a time until aligned on direction and scope, then proceed.

**Your job in capture:** spar → clarifying questions (one at a time) → sharpen into a hypothesis (via `/continuous-improvements` capture flow) → INSERT into Supabase `hypotheses` with `product=todolist` OR `product=morningbrew` (resolve from the inbound channel via `~/AI/discord/routes.json`), `workstream` from the route → reply with hypothesis summary + row id → ✅ react → idle.

### Ship phase — triggered ONLY by

- Inbound body exactly (trim, case-insensitive): `ship`, `go`, `/ship`.
- Inbound marker `{{TRIGGER}}=fanout-ship` (from `#shipments` drain, carries `ids=` CSV).

Drive the ship workflow per `~/AI/Products/build-system/continuous-improvements/workstreams/experiments/.claude/CLAUDE.md`. Mark the row `shipped` + post final summary.

### Return to capture — after every ship, always

After `shipped` (or abort), the NEXT inbound is capture-phase. Don't assume follow-up messages are ship continuations. A concrete trip: **capture → graduate → `ship` → shipped → [next inbound] → capture → …**

### Ambiguous inputs

If `ship` appears but isn't standalone (e.g. "can we ship this next week?"): reply-confirm "I see `ship` in your message — proceed now, or keep sparring?". Do NOT flip phases.

## Priority convention — the one canonical scale here

Supabase `tasks.priority` uses the **/todo skill convention: `0 = P0 (critical), 1 = P1, 2 = P2, 3 = P3, 4 = P4 (backlog)`**. Sort **ASC** to surface the highest-priority work first. `td_list` MCP, `td` CLI, and the /todo skill all rely on this direction.

**Heads-up for cross-product code:** morningbrew's `DeferredTask` type uses the opposite convention (4 = urgent, from the Todoist API). When morningbrew code reads from Supabase `tasks`, it must use the scale above — not the DeferredTask one. Cross-applying them silently surfaces backlog tasks as top-of-list (happened once; rationale and fix live in `Products/morningbrew/CLAUDE.md` § "Priority convention").

## Git Scope

This project is bound to repo: **`MiguelitoHaase1/todo`**
All git operations from this directory must target this repo. The `~/AI` workspace folder itself is NOT a git repo.

Nested exception: `pwa/` is a separate nested repo bound to `MiguelitoHaase1/todolist-pwa` and is `.gitignore`d here.

This is the source repo for the `td` CLI and the `/todo` skill.

## What lives here

- `src/` — CLI source code (TypeScript)
- `skills/` — Context files (know-michael.md, planning-principles.md) referenced by the `/todo` skill
- `bin/td.mjs` — Global CLI entry point

## What lives elsewhere

All task management logic (iMessage capture, triage, plan tomorrow, morning relay, Supabase credentials, formatting rules) is in the **`/todo` skill** at `~/.claude/skills/todo/SKILL.md`. Edit that file to change behavior.

The one-liner in `~/.claude/CLAUDE.md` Task & Channel Routing routes iMessage tasks to the `/todo` skill globally.

## CLI

Install globally: `npm link` from this directory. Then `td` works everywhere.

Or run directly: `npx tsx src/cli.ts <command>`

Commands: `add`, `list`, `done`, `show`, `triage`, `link`, `unlink`. All support `--json`.

## Development

```bash
npm test          # Run tests
npm run typecheck # Type check
```

## Task Management — Discord Channel Routing

This repo's scope is the `/todo` skill and the `td` CLI. The Discord channels routed here are:

| Channel name | Channel ID | Purpose |
|-------------|-----------|---------|
| `#tasks` | `1488660132429562080` | Quick capture, list, done, today |
| `#planning` | `1488660134702874814` | Triage, plan-tomorrow, morning relay (threaded) |

Both route through the `/todo` skill. iMessage task captures route here too (see `~/.claude/CLAUDE.md` Task & Channel Routing).

Multi-step flows in `#planning` use Discord threads for conversation isolation.

**Other channels** (`#morningbrew`, `#experiments`, `#improve-*`) are routed to other product repos. See the canonical mapping at `~/AI/discord/routes.json` and routing details in `~/AI/discord/CLAUDE.md`. The `#improve-*` workstreams in particular moved to `~/AI/Products/morningbrew/workstreams/` during the per-skill repo migration — they no longer live here.
