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

1. Read all workstreams/*/ideas-backlog.md files
2. Find all queued hypotheses across all workstreams
3. Pick the one with the highest priority (expected delta × confidence: high=0.9, medium=0.6, low=0.3). Break ties by oldest date.
4. Read that workstream's goal.md and .claude/CLAUDE.md for context
5. Read evals.json for eval definitions
6. Create an isolated git worktree: git worktree add .worktrees/experiment-<slug> -b experiment/<workstream>/<date>-<slug>
7. Implement the proposed change in the worktree
8. Run tests (npm test) to verify nothing breaks
9. Measure eval deltas (before/after) for the target eval IDs
10. If eval delta is positive and no regressions: merge to main and mark as shipped
11. If neutral or negative: mark as rejected with learnings
12. Update the hypothesis status in ideas-backlog.md
13. Write a detailed experiment log to workstreams/<slug>/experiment-log/
14. Clean up the worktree
15. Push changes to git remote

CIRCUIT BREAKERS — stop immediately if:
- 3 test failures on the same error
- More than 5 files changed (experiment too broad)
- Any eval regression
- Experiment takes longer than 30 minutes

Run exactly ONE experiment, then stop.
" >> "$LOG_FILE" 2>&1

echo "$(date -Iseconds) Experiment run complete" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
