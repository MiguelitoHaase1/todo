# Improvement dispatch → todo session — {{PROMPT_ID}}

- **Session:** {{SESSION}}
- **Originating chat_id:** {{CHAT_ID}}
- **Originating message_id:** {{MESSAGE_ID}}
- **Today:** {{TODAY}}
- **Verb / trigger:** {{VERB}}
- **Inbound body:**

> {{MESSAGE_BODY}}

## How to handle this

Your CLAUDE.md (`Products/todolist/CLAUDE.md`) defines the capture↔ship mode discipline. Follow it. A short reminder:

- **If `{{VERB}}` is exactly `fanout-ship`**, `#shipments` is draining the queue. Enter ship phase immediately. The inbound body contains `ids=<csv>` — ship those Supabase rows sequentially per the workstream CLAUDE.md at `~/AI/Products/build-system/continuous-improvements/workstreams/experiments/.claude/CLAUDE.md`. Post a consolidated summary when done. ✅ react on `{{MESSAGE_ID}}`.
- **Otherwise**, default: capture phase. Resolve `workstream` by looking up `{{CHAT_ID}}` in `~/AI/discord/routes.json`. Resolve `product` similarly — todolist's channels set `product=todolist`, morningbrew's channels set `product=morningbrew` (cd `../morningbrew` when working morningbrew files). Spar, sharpen, INSERT into Supabase `hypotheses`, reply with the row id, ✅ react. Do NOT edit any files.

## Discord responsiveness

Follow `~/AI/discord/CLAUDE.md` → "Discord Responsiveness Protocol" on `{{MESSAGE_ID}}` in `{{CHAT_ID}}` (⏳ → heartbeats → final reply → ✅ or ❌).
