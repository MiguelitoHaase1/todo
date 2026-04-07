# Todolist — Headless Brain

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

The one-liner in `~/.claude/CLAUDE.md` routes iMessage tasks to the `/todo` skill globally.

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

Task management commands (add, list, today, done, triage, plan, morning) can arrive from Discord in addition to iMessage. The /todo skill handles both.

| Channel name | Channel ID | Purpose |
|-------------|-----------|---------|
| `#tasks` | `1488660132429562080` | Quick capture, list, done, today |
| `#planning` | `1488660134702874814` | Triage, plan-tomorrow, morning relay (threaded) |
| `#morningbrew` | `1490598646868349128` | On-demand morning brew. Type any message to trigger today's draft; reply to adapt; "ship it" commits. Full routing in `~/AI/Me/Productivity/chief-of-staff/CLAUDE.md`. |
| `#experiments` | `1490974343096963244` | On-demand build-system experiment runner. Type "run", "go", or "run experiment" to execute the top queued hypothesis from Supabase. Other messages are conversation about the experiment. Routing in `~/AI/Products/build-system/continuous-improvements/workstreams/experiments/.claude/CLAUDE.md`. |

Multi-step flows in `#planning` use Discord threads for conversation isolation.

## Continuous Improvements — Discord Workstream Routing

This product has 3 improvement workstreams, each with a dedicated Discord channel.
When a message arrives from a `#improve-*` channel, determine the workstream from the channel name and load its context.

### Channel → Workstream Mapping

| Channel name | Channel ID | Workstream dir | Evals |
|-------------|-----------|---------------|-------|
| `#improve-input` | `1488480354426818620` | `workstreams/input/` | eval-001 |
| `#improve-processing` | `1488480355710271580` | `workstreams/processing/` | eval-002, eval-004, eval-005 |
| `#improve-output` | `1488480357048385619` | `workstreams/output/` | eval-003 |

### On every Discord message from an `#improve-*` channel:

1. **Identify the workstream** from the channel name (strip `improve-` prefix → workstream slug)
2. **Read `workstreams/<slug>/goal.md`** for strategic direction
3. **Read `workstreams/<slug>/.claude/CLAUDE.md`** for the full agent wiring (sparring flow, graduation, experiment workflow)
4. **Read `evals.json`** for eval definitions (reference by ID only — never copy content into the thread)
5. **Follow the sparring flow** defined in the workstream's CLAUDE.md
6. **Graduate hypotheses** to Supabase `hypotheses` table when the builder signals (see workstream CLAUDE.md for curl commands)

### Mode: Capture (default)

Every Discord message is a potential improvement idea. Spar with the builder to sharpen it into a structured hypothesis. One question at a time. Match the builder's energy. Reference eval IDs only.

### Mode: Execute (when told "run experiments" or scheduled)

Pick the top queued hypothesis from Supabase (`hypotheses` table, `product=todolist`), branch into a worktree, implement, measure eval deltas, ship or reject. See the workstream CLAUDE.md for full protocol and curl commands.
