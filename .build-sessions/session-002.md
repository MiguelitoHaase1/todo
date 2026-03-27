# Session 2: Todoist Export + Migration

**Task:** AI-vnv — Build Todoist export + migration script
**Date:** 2026-03-27
**Outcome:** Closed

## What was done

Built and ran migration script that pulls all Todoist data via REST API v1 and inserts into Supabase.

### Results

| Metric | Count |
|--------|-------|
| Todoist tasks | 112 |
| Supabase tasks | 112 |
| Count match | YES |
| Labels created | 22 (10 projects + 12 labels) |
| Task-label links | 112 |
| Parent/child links | 0 (none in Todoist) |

### Spot checks

1. "LinkedIn: How to use CC for stying sharp" — Todoist priority 1 (highest) → Supabase P0. Due date 2026-03-30 matches. Pass.
2. "Set up MCP server" — Todoist priority 3 → Supabase P2. Description matches. Project label "Private" correct. Pass.

### Priority mapping

Todoist v1 API: 4=urgent → P0, 3=high → P1, 2=medium → P2, 1=normal → P3.

### Script

`scripts/migrate-todoist.ts` — idempotent (checks todoist_id before insert), handles pagination, creates labels from projects + Todoist labels.

## Unblocked

- AI-kg0: Verify migration integrity
