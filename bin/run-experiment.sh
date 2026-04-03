#!/bin/bash
# Run one continuous-improvement experiment at 5am.
# Called by cron. Logs to ~/AI/Products/todolist/experiment-runs.log

set -euo pipefail

PRODUCT_DIR="$HOME/AI/Products/todolist"
LOG_FILE="$PRODUCT_DIR/experiment-runs.log"
CLAUDE="$HOME/.local/bin/claude"

# Ensure PATH includes homebrew + bun for test runners
export PATH="/opt/homebrew/bin:$HOME/.bun/bin:$HOME/.local/bin:$PATH"

cd "$PRODUCT_DIR"

echo "$(date -Iseconds) Starting experiment run" >> "$LOG_FILE"

# Run Claude Code in non-interactive print mode with execute instructions
$CLAUDE --dangerously-skip-permissions --print -p "
You are in EXECUTE mode for the todolist continuous-improvements system.

1. Query Supabase for the top queued hypothesis (product=todolist, ordered by expected_delta desc):
   curl -s 'https://xwxsrsybllifbivhgojl.supabase.co/rest/v1/hypotheses?status=eq.queued&product=eq.todolist&order=expected_delta.desc&limit=1' -H 'apikey: sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk' -H 'Authorization: Bearer sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk'
2. If no queued hypotheses, exit cleanly
3. Read that workstream's goal.md and .claude/CLAUDE.md for context
4. Read evals.json for eval definitions
5. Create an isolated git worktree: git worktree add .worktrees/experiment-<slug> -b experiment/<workstream>/<date>-<slug>
6. Implement the proposed change in the worktree
7. Run tests (npm test) to verify nothing breaks
8. Measure eval deltas (before/after) for the target eval IDs
9. If eval delta is positive and no regressions: merge to main and mark as shipped
10. If neutral or negative: mark as rejected with learnings
11. Update the hypothesis status in Supabase:
    curl -s -X PATCH 'https://xwxsrsybllifbivhgojl.supabase.co/rest/v1/hypotheses?id=eq.<UUID>' -H 'apikey: sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk' -H 'Authorization: Bearer sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk' -H 'Content-Type: application/json' -d '{\"status\":\"shipped\",\"result\":\"...\"}'
12. Write a detailed experiment log to workstreams/<slug>/experiment-log/
13. Clean up the worktree
14. Push changes to git remote

CIRCUIT BREAKERS — stop immediately if:
- 3 test failures on the same error
- More than 5 files changed (experiment too broad)
- Any eval regression
- Experiment takes longer than 30 minutes

Run exactly ONE experiment, then stop.
" >> "$LOG_FILE" 2>&1

echo "$(date -Iseconds) Experiment run complete" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
