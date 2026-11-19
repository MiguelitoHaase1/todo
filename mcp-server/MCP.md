# Todo MCP — reference

Michael's personal todo list, served as a remote MCP server. Any MCP client can use it:
claude.ai, Claude Code, or a Lovable connector. The data lives in Supabase, the same tables the
`td` CLI reads.

## Connect

| | |
|---|---|
| **MCP URL** | `https://todolist-mcp-server.vercel.app/api/mcp` |
| **Transport** | Streamable HTTP, `POST` only, stateless (no session id) |
| **Auth** | OAuth 2.1 with PKCE and dynamic client registration |
| **Scope** | `mcp` |

The bare `/mcp` path returns 404. Use `/api/mcp`.

### How sign-in works

1. The client calls `/api/mcp` without a token and gets `401` with a `WWW-Authenticate` header.
   That header points at `/.well-known/oauth-protected-resource`.
2. The client reads `/.well-known/oauth-authorization-server` and registers itself at
   `/api/register`. Any valid redirect URI is accepted.
3. A consent page opens at `/api/authorize`. It asks for one passphrase:
   `OAUTH_CONSENT_PASSWORD`. Only Michael has it. This is a single-user server.
4. The client swaps the code at `/api/token`. It gets a 1-hour access token (JWT) and a 30-day
   refresh token.

When the refresh token runs out, the client has to sign in again.

## The data

A task looks like this:

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "priority": 0,
  "status": "open | done | dropped",
  "due_date": "YYYY-MM-DD | null",
  "deferral_count": 0,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Priority** runs 0 to 4. 0 is critical, 1 matters this week, 2 is normal, 3 is low (the default),
4 is backlog. Lower number means more urgent.

**Task ids.** Every tool that takes an `id` accepts the full UUID or a short prefix of at least 4
characters, as long as the prefix matches one task.

**Nothing is ever deleted.** Dropping a task sets its status to `dropped`.

**Every change is logged.** Each write adds a row to `task_events` with `source: "mcp"`. That keeps
changes made through MCP apart from changes made in the CLI.

## Tools

13 tool names. 5 read, 8 write. `td_update` and `td_edit` are the same tool under two names.

### Read

#### `td_list`
List tasks. Open tasks by default, sorted by priority, then due date.

| Arg | Type | Default | Notes |
|---|---|---|---|
| `status` | `open` · `done` · `dropped` · `all` | `open` | |
| `today` | boolean | false | Only tasks due today. Overrides `due_date`. |
| `due_date` | `YYYY-MM-DD` | | Only tasks due on this exact date. |
| `limit` | 1–200 | 50 | |

Returns `{ count, tasks }`.

#### `td_show`
One task with its labels and links.

| Arg | Type | Notes |
|---|---|---|
| `id` | string | Required. |

Returns the task plus `labels: string[]` and `links: { id, title, linkType, direction }[]`.

#### `td_triage_list`
Open tasks that need a decision: overdue, due tomorrow, or stale. Stale means P3 or P4, no due
date, and no recent update. Items are numbered from 1. No arguments.

Returns `{ count, items: [{ index, task, reason }] }`. `reason` is `overdue`, `due tomorrow` or
`stale, no date`.

#### `td_morning_context`
Everything needed to plan a day: tasks due that day, overdue tasks, tasks deferred 2 or more times,
and groups of linked tasks at the same priority. It returns data only. The client does the planning.

| Arg | Type | Default |
|---|---|---|
| `date` | `YYYY-MM-DD` | today |

Returns `{ date, today_tasks, overdue_tasks, escalations, batches }`.

#### `td_plan_tomorrow_context`
Everything needed to plan tomorrow: a recap of today (done, deferred, dropped, still open),
tomorrow's tasks, the top of the backlog, escalations and batches. Data only.

| Arg | Type | Default |
|---|---|---|
| `date` | `YYYY-MM-DD` | today + 1 |
| `backlog_limit` | 1–100 | 20 |

Returns `{ today, tomorrow, today_recap, tomorrow_tasks, backlog, escalations, batches }`.

### Write

#### `td_add`
Create a task.

| Arg | Type | Default | Notes |
|---|---|---|---|
| `title` | string, 1–500 chars | | Required. |
| `description` | string, up to 20,000 chars | | Markdown is fine. |
| `priority` | 0–4 | 3 | |
| `due_date` | `YYYY-MM-DD` | | |

Returns the new task.

#### `td_done`
Mark a task done. Calling it twice is safe: a task that is already done comes back unchanged.

| Arg | Type |
|---|---|
| `id` | string |

#### `td_drop`
Drop a task. The task stays in the database with status `dropped`. Calling it twice is safe.

| Arg | Type |
|---|---|
| `id` | string |

#### `td_update` (also `td_edit`)
Change a task in place. Only the fields you pass change.

| Arg | Type | Notes |
|---|---|---|
| `id` | string | Required. |
| `title` | string, 1–500 chars | |
| `description` | string | An empty string clears it. |
| `priority` | 0–4 | |
| `due_date` | `YYYY-MM-DD` or `""` | An empty string clears it. |
| `notes` | string, up to 2,000 chars | Added to the end of the description as `Note YYYY-MM-DD: …`. Keeps what is there. |

One event row is written per field that actually changed. Returns the updated task.

#### `td_link`
Link two tasks.

| Arg | Type | Default | Notes |
|---|---|---|---|
| `source_id` | string | | Required. |
| `target_id` | string | | Required. |
| `link_type` | `related` · `parent` | `related` | `related` works both ways. `parent` makes the source the parent of the target. |

Fails if the two tasks are already linked. Returns `{ source_id, target_id, link_type, created_at }`.

#### `td_unlink`
Remove every link between two tasks.

| Arg | Type |
|---|---|
| `source_id` | string |
| `target_id` | string |

#### `td_triage_execute`
Apply a triage reply to the triage list.

| Arg | Type | Example |
|---|---|---|
| `reply` | string | `"drop 1 3, defer 2, keep 4"`, `"drop all"`, `"keep all"` |

- **drop** sets the task to `dropped`.
- **defer** moves the due date one week out and adds 1 to `deferral_count`.
- **keep** changes nothing.

**Call `td_triage_list` right before this one.** The tool rebuilds the list itself and matches your
numbers against that fresh list. Numbers from an older list can hit the wrong task.

Returns `{ summary, actions, items_count }`.

## Rules for an agent using it

- Only add a task when Michael asked for it, or when he said out loud that he would do it. Every
  task needs a due date and a priority.
- Prefer `td_drop` to anything that looks like a delete. Nothing here deletes.
- The two `_context` tools return data. Don't treat their output as a plan.
- A task deferred 3 times or more needs a decision: do it today or drop it. Don't defer it again
  without asking.

## Source

Code: `~/AI/Products/todolist/mcp-server/` (GitHub `MiguelitoHaase1/todo`). Tools are in
`src/tools/`, one file each. Deployed on Vercel with `npx vercel deploy --prod --yes`.
