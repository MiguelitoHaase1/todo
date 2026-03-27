# Todolist — Headless Brain

For context about Michael's priorities, daily rhythms, and decision-making, see `skills/know-michael.md`.
For planning principles (how to prioritize, schedule, triage, and handle overflow), see `skills/planning-principles.md`.

## iMessage Task Capture

When you receive a `<channel source="imessage">` message, check if it looks like a task. A task message is any short text that isn't a question or conversational reply.

### How to handle task messages

1. Parse the message text for task components:
   - **Title**: The main text (everything except priority and date tokens)
   - **Priority**: `p0` through `p4` (case-insensitive). Default: `p3`
   - **Due date**: `YYYY-MM-DD` format. Default: none

2. Create the task in Supabase using the REST API:
   ```
   POST {SUPABASE_URL}/rest/v1/tasks
   Headers: apikey + Authorization Bearer {SUPABASE_KEY}, Content-Type: application/json, Prefer: return=representation
   Body: { "title": "...", "priority": N, "due_date": "..." or null, "status": "open" }
   ```

3. Reply via the `reply` MCP tool with confirmation:
   - Format: `Added: {title} (P{n}{, due YYYY-MM-DD if set})`
   - Keep it short — this is a phone notification

### Supabase credentials

```
SUPABASE_URL=https://xwxsrsybllifbivhgojl.supabase.co
SUPABASE_KEY=sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk
```

### Examples

| iMessage text | Action |
|---------------|--------|
| `Buy milk p2` | Create task: "Buy milk", P2, no due date |
| `Call dentist 2026-04-01 p1` | Create task: "Call dentist", P1, due 2026-04-01 |
| `Fix the roof` | Create task: "Fix the roof", P3 (default), no due date |
| `What's on my list?` | NOT a task — answer conversationally using td list |
| `Hey how are you` | NOT a task — respond normally |

### Non-task iMessage commands

- `list` or `what's on my list` → Query Supabase for open tasks, reply with summary
- `today` → Query tasks where due_date = today
- `done {short-id}` → Mark task complete, reply with confirmation
- `triage` → Trigger the triage flow (see below)

### Triage flow via iMessage

When a user sends `triage`, or when the system proactively surfaces tasks for review:

1. **Build the triage list** by querying Supabase for:
   - Tasks due tomorrow
   - Overdue tasks (due before today)
   - Stale P3/P4 tasks with no due date (not updated in 7+ days)

2. **Send a numbered summary** via iMessage:
   ```
   5 tasks to triage:

   1. Call dentist (P1, overdue) — overdue
   2. Fix the roof (P3, no date) — stale, no date
   3. Buy groceries (P2, tomorrow) — due tomorrow

   Reply: drop 1, defer 3, keep 2
   Or: drop all, keep all
   ```

3. **Parse the reply** — supports:
   - `drop 1 3` → Mark tasks 1 and 3 as done (archived)
   - `defer 2` → Move task 2's due date to next week
   - `keep 4` → No action, acknowledge
   - `drop all` / `keep all` / `defer all` → Bulk action
   - Comma-separated: `drop 1, defer 2 3, keep 4`

4. **Execute and confirm** within 5 seconds:
   ```
   Dropped: Call dentist
   Deferred to 2026-04-03: Buy groceries
   Kept: Fix the roof
   ```

The triage module lives at `src/commands/triage.ts` with exported functions:
- `buildTriageList()` → returns numbered TriageItem[]
- `formatTriageMessage(items)` → iMessage-ready string
- `parseTriageReply(reply, maxIndex)` → parsed actions
- `executeTriageActions(items, actions)` → executes and returns summary

### CLI tool

The `td` CLI is available at `src/cli.ts`. Run with: `npx tsx src/cli.ts <command>`

Commands: `add`, `list`, `done`, `show`, `triage`. All support `--json`.
