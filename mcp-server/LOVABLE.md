# Brief for the Lovable agent: my Todo MCP

This is my personal todo list, served as an MCP server. I want you to be able to read and update my
tasks while we work together. Read this whole brief before you call any tool.

## 1. What it is

- **Server name:** Todo
- **URL:** `https://todolist-mcp-server.vercel.app/api/mcp`
- **Transport:** Streamable HTTP, `POST` only, no sessions.
- **Auth:** a fixed API key sent as `Authorization: Bearer <key>`. OAuth also works, but the key is
  simpler. It's a single-user server: every task in it is mine.

## 2. How you get access

**You can't connect it yourself, and you don't need to.** I add it as a custom MCP chat connector in
Connectors (Add custom → MCP server → Bearer token) and paste the key there. Once it's connected, the `td_*`
tools below show up for you in chat.

If you can't see any `td_*` tools, stop and tell me. Don't build a workaround.

**The connector works in chat only.** You can call the tools while we talk and build. The app you
publish can't call them through the connector. If a feature needs my tasks at runtime, read
section 6 before you write any code.

## 3. The data

A task:

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

- **Priority runs 0 to 4. A lower number is more urgent.** 0 is critical, 1 matters this week,
  2 is normal, 3 is low (the default), 4 is backlog. Sort ascending to show the important work
  first. Never show "high", "medium" or "low". Show `P0` to `P4`.
- **Ids.** Any tool that takes an `id` accepts the full UUID or a short prefix of 4+ characters.
- **Nothing is deleted.** Dropping a task sets `status` to `dropped`.
- **Every write is logged** in `task_events` with `source: "mcp"`.

## 4. Tools

### Read (safe to call any time)

| Tool | Args | Returns |
|---|---|---|
| `td_list` | `status` (`open`·`done`·`dropped`·`all`, default `open`), `today` (bool), `due_date` (`YYYY-MM-DD`), `limit` (1–200, default 50) | `{ count, tasks }` sorted by priority, then due date |
| `td_show` | `id` | the task plus `labels` and `links` |
| `td_triage_list` | none | `{ count, items: [{ index, task, reason }] }`. The reason is `overdue`, `due tomorrow` or `stale, no date` |
| `td_morning_context` | `date` (default today) | `{ date, today_tasks, overdue_tasks, escalations, batches }` |
| `td_plan_tomorrow_context` | `date` (default tomorrow), `backlog_limit` (1–100, default 20) | `{ today, tomorrow, today_recap, tomorrow_tasks, backlog, escalations, batches }` |

The two `_context` tools return raw data, not a plan. `escalations` lists tasks I've deferred 2 or
more times.

### Write (these change my real list)

| Tool | Args | What it does |
|---|---|---|
| `td_add` | `title` (required), `description`, `priority` (default 3), `due_date` | Creates a task |
| `td_done` | `id` | Marks it done. Safe to repeat |
| `td_drop` | `id` | Sets it to `dropped`. Safe to repeat |
| `td_update` | `id`, plus any of `title`, `description`, `priority`, `due_date`, `notes` | Changes only the fields you pass. Send `""` to clear `description` or `due_date`. `notes` is added to the end of the description as a dated line |
| `td_link` | `source_id`, `target_id`, `link_type` (`related`·`parent`) | Links two tasks. Fails if they're already linked |
| `td_unlink` | `source_id`, `target_id` | Removes the links between two tasks |
| `td_triage_execute` | `reply`, e.g. `"drop 1 3, defer 2, keep 4"` | Applies triage. **Defer** moves the due date one week out |

`td_edit` is the same tool as `td_update`.

## 5. Rules

1. **This is real data. Never write test or sample tasks.** For demos, seed data, and anything that
   only checks a feature works, use fake data in the app's own database.
2. **Only write when I ask.** Read freely. Add, close, drop or edit a task only when I tell you to.
   Then say what you changed, one line per task.
3. **Every new task gets a due date and a priority.** If I don't give a date, use the next workday
   and tell me you guessed.
4. **Call `td_triage_list` right before `td_triage_execute`.** The numbers in my reply refer to that
   list. A number from an older list can hit the wrong task.
5. **Don't defer a task a third time.** If its `deferral_count` is 2 or more, ask me: do it today
   or drop it?
6. **Never put the URL, a token or my tasks in client-side code.**

## 6. If the published app needs my tasks

The chat connector won't do this. The app's backend has to call the server itself, from an edge
function, with a secret:

```http
POST https://todolist-mcp-server.vercel.app/api/mcp
Authorization: Bearer <TODO_MCP_KEY>
Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"td_list","arguments":{"today":true}}}
```

The answer is JSON. The tool's output is in `result.structuredContent` as an object, and again in
`result.content[0].text` as a JSON string.

- `TODO_MCP_KEY` is the same key I use for the connector. Ask me to add it as a project secret.
  Never put it in code, and never send it to the browser.
- The browser calls your edge function. The edge function calls the MCP.
- **If `TODO_MCP_KEY` isn't in the secrets yet, stop and ask me.** Don't build an OAuth flow or a
  token refresher to get around it.
