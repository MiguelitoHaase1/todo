# todolist-mcp-server

Remote MCP server wrapping the `td` CLI. OAuth 2.1 protected (PKCE + dynamic
client registration). Deployed on Vercel. Designed to be used from claude.ai
custom connectors and Claude Code alike.

**Live URL**: https://todolist-mcp-server.vercel.app

## Tools (10)

| Tool | Type | Purpose |
|---|---|---|
| `td_list` | read | List tasks (filter by status / today / due_date) |
| `td_show` | read | Task detail with labels and links |
| `td_triage_list` | read | Surface overdue/due-tomorrow/stale tasks |
| `td_morning_context` | read | Today's tasks + escalations + batches for morning planning |
| `td_plan_tomorrow_context` | read | Today recap + tomorrow + backlog for tomorrow planning |
| `td_add` | mutate | Create a task |
| `td_done` | mutate | Mark done |
| `td_link` | mutate | Link two tasks (related or parent) |
| `td_unlink` | mutate | Remove links between two tasks |
| `td_triage_execute` | mutate | Apply triage actions ("drop 1, defer 2, keep 3") |

The two `_context` tools are **data fetch only** — they return structured data
about tasks, escalations, and batches. The actual day-shaping and reflection
happens in the calling LLM (claude.ai or Claude Code), where it belongs.

Every mutation emits a `task_events` row with `source: "mcp"` so the audit
log can distinguish Claude-driven actions from CLI-driven ones.

## Architecture

- **Functions**: All logic lives in `api/*.ts` (Vercel functions). The MCP
  endpoint, OAuth endpoints, and well-known metadata are each their own
  function.
- **Reuse via sync script**: `scripts/sync-shared.mjs` copies the canonical
  Supabase data layer and triage helpers from `../src/` into `src/_shared/`,
  rewriting `process.exit()` calls to throws and `.ts` import extensions to
  `.js`. Runs as part of `vercel-build` locally; gracefully no-ops on Vercel
  (where the synced files are already present from the local pre-deploy run).
- **OAuth**: Self-contained micro authorization server collocated with the
  resource server. Single-user model — the `/authorize` consent screen
  requires entering `OAUTH_CONSENT_PASSWORD`. After consent, issues an HS256
  JWT access token (1h) plus an opaque refresh token (30d).

## Required env vars

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Existing Supabase project URL (same as the CLI) |
| `SUPABASE_KEY` | Supabase service key (same as the CLI) |
| `JWT_SIGNING_KEY` | 256-bit HS256 secret (`openssl rand -base64 32`) |
| `OAUTH_CONSENT_PASSWORD` | Passphrase typed into the consent screen |
| `PUBLIC_URL` | Canonical public URL, no trailing slash |

Local: keep these in `mcp-server/.env.local` (gitignored). Vercel: set per
environment via `vercel env add`.

## Local development

```bash
cd mcp-server
npm install
# Source .env.local in your shell so vercel dev forwards it to the function
set -a; source .env.local; set +a
PUBLIC_URL=http://localhost:3001 npx vercel dev --listen 3001
```

Test the OAuth flow with curl:

```bash
# 1. Register a client
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"curl","redirect_uris":["http://localhost:9999/callback"]}'

# 2. Generate PKCE pair
VERIFIER=$(openssl rand -base64 64 | tr -d "=+/\n" | cut -c1-64)
CHALLENGE=$(printf "%s" "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr -d "=\n" | tr "+/" "-_")

# 3. Open in browser to fill the consent form:
#    http://localhost:3001/api/authorize?client_id=...&redirect_uri=...&...

# 4. Exchange code for tokens
curl -X POST http://localhost:3001/api/token \
  -d "grant_type=authorization_code&code=...&code_verifier=$VERIFIER&..."

# 5. Call the MCP endpoint
curl -X POST http://localhost:3001/api/mcp \
  -H "Authorization: Bearer <access_token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Deploying

```bash
cd mcp-server
node scripts/sync-shared.mjs   # regenerate _shared/ from upstream src/
npx vercel deploy --prod --yes
```

The deploy uploads `src/_shared/` (which is gitignored but allowed by
`.vercelignore`) and the build skips the sync step gracefully (since
`../src/` doesn't exist in the Vercel build environment).

## Adding to claude.ai

1. Open claude.ai → Settings → Connectors → "Add custom connector"
2. URL: `https://todolist-mcp-server.vercel.app/api/mcp`
3. claude.ai discovers `/.well-known/oauth-protected-resource` and walks
   through the OAuth flow
4. You'll be redirected to the consent screen on the same domain. Enter the
   `OAUTH_CONSENT_PASSWORD` and click Approve
5. claude.ai stores the issued token; the 10 tools become available in
   chats and Projects

## Adding to Claude Code

```bash
claude mcp add --transport http todolist https://todolist-mcp-server.vercel.app/api/mcp
```

Claude Code will trigger the same OAuth flow on first use.

## Files of interest

- `api/mcp.ts` — JWT-gated MCP endpoint with WWW-Authenticate discovery header
- `api/{authorize,token,register}.ts` — OAuth endpoints
- `api/well-known/*.ts` — RFC 9728 + RFC 8414 metadata
- `src/auth/{jwt,pkce,store,middleware,consent-page}.ts` — OAuth machinery
- `src/server.ts` — McpServer instance, registers all 10 tools
- `src/tools/*.ts` — one tool per file
- `src/_shared/` — auto-generated copies of `../src/{supabase,format,deferral,batch}.ts` and `../src/commands/triage.ts`
- `scripts/sync-shared.mjs` — the load-bearing copy+rewrite script
