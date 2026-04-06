#!/bin/bash
# Run one continuous-improvement experiment at 5am.
# Called by cron. Picks the top queued hypothesis across ALL products.
# Logs to ~/AI/Products/experiment-runs.log

set -euo pipefail

PRODUCTS_DIR="$HOME/AI/Products"
LOG_FILE="$PRODUCTS_DIR/experiment-runs.log"
CLAUDE="$HOME/.local/bin/claude"
SUPABASE_URL="https://xwxsrsybllifbivhgojl.supabase.co/rest/v1"
SUPABASE_KEY="sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk"

# Ensure PATH includes homebrew + bun for test runners
export PATH="/opt/homebrew/bin:$HOME/.bun/bin:$HOME/.local/bin:$PATH"

echo "$(date -Iseconds) Starting experiment run" >> "$LOG_FILE"

# ── Auth preflight ─────────────────────────────────────────────────────
# Catch expired credentials BEFORE picking a hypothesis. If Claude Code is
# not logged in, abort cleanly and ping Discord so you notice in the morning.
notify_discord() {
  local msg="$1"
  local discord_env="$HOME/.claude/channels/discord/.env"
  [ -f "$discord_env" ] || return 0
  local bot_token
  bot_token=$(grep '^DISCORD_BOT_TOKEN=' "$discord_env" | cut -d= -f2- | tr -d '"' | tr -d "'")
  [ -n "$bot_token" ] || return 0
  local channel_id="${REPORTS_CHANNEL_ID:-1489857755920470148}"
  curl -sS -X POST "https://discord.com/api/v10/channels/$channel_id/messages" \
    -H "Authorization: Bot $bot_token" \
    -H "Content-Type: application/json" \
    -d "{\"content\": $(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}" \
    >> "$LOG_FILE" 2>&1 || true
}

AUTH_CHECK=$("$CLAUDE" --dangerously-skip-permissions --print -p "Reply with exactly the word: pong" 2>&1 || true)
if echo "$AUTH_CHECK" | grep -qiE "not logged in|please run /login|authentication failed"; then
  HOSTNAME_SHORT=$(hostname -s)
  MSG="🔴 Overnight experiment ABORTED on \`$HOSTNAME_SHORT\` at $(date -Iseconds) — Claude Code not logged in. SSH in and run: \`claude /login\`"
  echo "$(date -Iseconds) AUTH PREFLIGHT FAILED: $AUTH_CHECK" >> "$LOG_FILE"
  notify_discord "$MSG"
  echo "---" >> "$LOG_FILE"
  exit 1
fi
echo "$(date -Iseconds) Auth preflight OK" >> "$LOG_FILE"

# Find the top queued hypothesis across all products
TOP=$(curl -sf "$SUPABASE_URL/hypotheses?status=eq.queued&order=expected_delta.desc&limit=1" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY")

# Check if queue is empty
if [ "$TOP" = "[]" ] || [ -z "$TOP" ]; then
  echo "$(date -Iseconds) No queued hypotheses. Skipping." >> "$LOG_FILE"
  echo "---" >> "$LOG_FILE"
  exit 0
fi

PRODUCT=$(echo "$TOP" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['product'])")
PRODUCT_DIR="$PRODUCTS_DIR/$PRODUCT"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "$(date -Iseconds) Product directory not found: $PRODUCT_DIR" >> "$LOG_FILE"
  echo "---" >> "$LOG_FILE"
  exit 1
fi

echo "$(date -Iseconds) Selected product: $PRODUCT" >> "$LOG_FILE"

cd "$PRODUCT_DIR"

# Run Claude Code in non-interactive print mode with execute instructions
$CLAUDE --dangerously-skip-permissions --print -p "
You are in EXECUTE mode for the $PRODUCT continuous-improvements system.

1. Query Supabase for the top queued hypothesis (product=$PRODUCT, ordered by expected_delta desc):
   curl -s '$SUPABASE_URL/hypotheses?status=eq.queued&product=eq.$PRODUCT&order=expected_delta.desc&limit=1' -H 'apikey: $SUPABASE_KEY' -H 'Authorization: Bearer $SUPABASE_KEY'
2. If no queued hypotheses, exit cleanly — do NOT commit, push, or write any files
3. Read that workstream's goal.md and .claude/CLAUDE.md for context
4. Read evals.json for eval definitions
5. Create an isolated git worktree: git worktree add .worktrees/experiment-<slug> -b experiment/<workstream>/<date>-<slug>
6. Implement the proposed change in the worktree
7. Run tests (npm test) to verify nothing breaks
8. Measure eval deltas (before/after) for the target eval IDs
9. Apply decision thresholds: |eval delta| >= 0.05 and positive → ship. |eval delta| >= 0.05 and negative → reject. |eval delta| < 0.05 → mark as inconclusive (hypothesis returns to queued for redesign)
10. If shipped: merge to main. If rejected: log learnings. If inconclusive: revert changes, log the weak signal.
11. Update the hypothesis status in Supabase:
    curl -s -X PATCH '$SUPABASE_URL/hypotheses?id=eq.<UUID>' -H 'apikey: $SUPABASE_KEY' -H 'Authorization: Bearer $SUPABASE_KEY' -H 'Content-Type: application/json' -d '{\"status\":\"shipped\",\"result\":\"...\"}'
12. Write a detailed experiment log to workstreams/<slug>/experiment-log/
13. Clean up the worktree

IMPORTANT RULES:
- Do NOT run 'git push' or push to any git remote. Local commits only.
- Do NOT commit heartbeat logs, failure logs, or any non-experiment files.
- If Supabase is unreachable or returns errors, abort cleanly without committing anything.
- If no hypothesis is found, exit immediately without side effects.

CIRCUIT BREAKERS — stop immediately if:
- 3 test failures on the same error
- More than 5 files changed (experiment too broad)
- Any eval regression
- Experiment takes longer than 30 minutes

Run exactly ONE experiment, then stop.
" >> "$LOG_FILE" 2>&1

echo "$(date -Iseconds) Experiment run complete (product: $PRODUCT)" >> "$LOG_FILE"

# Post heartbeat report to Discord #reports (runs from build-system dir, not product dir)
HEARTBEAT="$HOME/AI/Products/build-system/continuous-improvements/bin/heartbeat-report.ts"
if [ -f "$HEARTBEAT" ]; then
  echo "$(date -Iseconds) Posting heartbeat report..." >> "$LOG_FILE"
  cd "$HOME/AI/Products/build-system"
  bun "$HEARTBEAT" >> "$LOG_FILE" 2>&1 || echo "$(date -Iseconds) Heartbeat report failed (non-fatal)" >> "$LOG_FILE"
fi

echo "---" >> "$LOG_FILE"
