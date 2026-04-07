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

This repo's scope is the `/todo` skill and the `td` CLI. The Discord channels routed here are:

| Channel name | Channel ID | Purpose |
|-------------|-----------|---------|
| `#tasks` | `1488660132429562080` | Quick capture, list, done, today |
| `#planning` | `1488660134702874814` | Triage, plan-tomorrow, morning relay (threaded) |

Both route through the `/todo` skill. iMessage task captures route here too (see `~/.claude/CLAUDE.md`).

Multi-step flows in `#planning` use Discord threads for conversation isolation.

**Other channels** (`#morningbrew`, `#experiments`, `#improve-*`) are routed to other product repos. See the canonical mapping at `~/AI/discord/routes.json` and the global routing in `~/.claude/CLAUDE.md`. The `#improve-*` workstreams in particular moved to `~/AI/Products/morningbrew/workstreams/` during the per-skill repo migration — they no longer live here.
