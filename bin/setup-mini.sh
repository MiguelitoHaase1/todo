#!/bin/bash
# setup-mini.sh — Bootstrap the Mac mini to run overnight experiments.
#
# Run this ONCE on the Mac mini after SSH-ing in for the first time.
# Idempotent: safe to re-run.
#
# Prerequisites on the mini (install manually before running this script):
#   - Homebrew: https://brew.sh
#   - GitHub CLI: brew install gh  (then: gh auth login)
#   - bun: curl -fsSL https://bun.sh/install | bash
#   - Claude Code: https://docs.claude.com/claude-code  (then: claude /login)
#
# After this script runs successfully:
#   - ~/AI is cloned and up to date
#   - .env is populated with your secrets (from the interactive prompt)
#   - cron entry is installed to run experiments at 05:00 daily
#   - An auth preflight is run to confirm everything works
#
# To update the mini later, just: cd ~/AI && git pull

set -euo pipefail

REPO_URL="https://github.com/MiguelitoHaase1/ai-workspace.git"
AI_DIR="$HOME/AI"
CRON_LINE="0 5 * * * $AI_DIR/Products/todolist/bin/run-experiment.sh"

say() { printf "\n\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "  \033[1;32m✓\033[0m %s\n" "$*"; }
die() { printf "  \033[1;31m✗\033[0m %s\n" "$*" >&2; exit 1; }

# ── 1. Preflight: check required tooling ──────────────────────────────
say "Checking prerequisites"
command -v git    >/dev/null || die "git not found — install Xcode Command Line Tools: xcode-select --install"
command -v gh     >/dev/null || die "gh not found — brew install gh && gh auth login"
command -v bun    >/dev/null || die "bun not found — curl -fsSL https://bun.sh/install | bash"
command -v claude >/dev/null || die "claude not found — install Claude Code: https://docs.claude.com/claude-code"
command -v python3 >/dev/null || die "python3 not found (needed for JSON parsing)"
ok "All required tools present"

# ── 2. Clone or update the repo ───────────────────────────────────────
say "Syncing $AI_DIR with $REPO_URL"
if [ -d "$AI_DIR/.git" ]; then
  cd "$AI_DIR"
  git fetch origin
  git pull --rebase origin main
  ok "Repo updated"
else
  gh repo clone MiguelitoHaase1/ai-workspace "$AI_DIR"
  ok "Repo cloned"
fi

# ── 3. Bootstrap .env (if missing) ────────────────────────────────────
say "Checking secrets file"
if [ -f "$AI_DIR/.env" ]; then
  ok ".env already exists — leaving it alone"
else
  if [ ! -f "$AI_DIR/.env.example" ]; then
    die ".env.example missing from repo — aborting"
  fi
  cp "$AI_DIR/.env.example" "$AI_DIR/.env"
  echo "  Created $AI_DIR/.env from template."
  echo "  Edit it now with real values:"
  echo "    nano $AI_DIR/.env"
  echo ""
  read -r -p "  Press RETURN when you've saved .env with real secrets... "
  ok ".env populated"
fi

# ── 4. Discord bot token (for auth-failure notifications) ─────────────
say "Checking Discord bot token (for overnight failure alerts)"
DISCORD_ENV="$HOME/.claude/channels/discord/.env"
if [ -f "$DISCORD_ENV" ] && grep -q '^DISCORD_BOT_TOKEN=' "$DISCORD_ENV"; then
  ok "Discord bot token already configured"
else
  mkdir -p "$(dirname "$DISCORD_ENV")"
  echo "  Discord bot token missing. Auth-failure alerts won't reach Discord."
  echo "  (Optional — skip by pressing RETURN, or paste token now.)"
  read -r -p "  DISCORD_BOT_TOKEN (empty to skip): " TOKEN
  if [ -n "$TOKEN" ]; then
    echo "DISCORD_BOT_TOKEN=$TOKEN" > "$DISCORD_ENV"
    chmod 600 "$DISCORD_ENV"
    ok "Discord bot token saved"
  else
    echo "  Skipped — no Discord alerts on auth failure."
  fi
fi

# ── 5. Auth preflight ─────────────────────────────────────────────────
say "Running Claude Code auth preflight"
if claude --dangerously-skip-permissions --print -p "Reply with exactly the word: pong" 2>&1 | grep -qiE "not logged in|please run /login"; then
  die "Claude Code is not logged in. Run: claude /login"
fi
ok "Claude Code is authenticated"

# ── 6. Install cron entry ─────────────────────────────────────────────
say "Installing cron entry"
EXISTING_CRON=$(crontab -l 2>/dev/null || true)
if echo "$EXISTING_CRON" | grep -Fq "run-experiment.sh"; then
  ok "Cron entry already present — leaving it alone"
else
  (echo "$EXISTING_CRON"; echo "# CI experiment runner — one experiment per night"; echo "$CRON_LINE") | crontab -
  ok "Cron entry added: $CRON_LINE"
fi

# ── 7. Summary ────────────────────────────────────────────────────────
say "Mini is ready"
echo ""
echo "  Next experiment run: tomorrow at 05:00 local time"
echo "  Logs: $AI_DIR/Products/experiment-runs.log"
echo "  Manual trigger: $AI_DIR/Products/todolist/bin/run-experiment.sh"
echo ""
echo "  To update the mini with new commits from your laptop:"
echo "    cd $AI_DIR && git pull"
echo ""
