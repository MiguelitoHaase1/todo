# Session 1: Design Supabase Schema

**Task:** AI-vk2 — Design Supabase schema for tasks
**Date:** 2026-03-27
**Outcome:** Closed

## What was done

Designed and deployed the Supabase schema for the Headless Brain task system. Four tables on the shared Morning Brew instance.

### Schema

| Table | Purpose |
|-------|---------|
| `tasks` | Core task storage: title, description, priority (0-4), status, due_date, todoist_id |
| `labels` | Flexible grouping: name + label_type (project, context, area, etc.) |
| `task_labels` | Junction: many-to-many tasks ↔ labels |
| `task_links` | Relationships: source_id ↔ target_id with link_type (parent, child, related) |

### Verification

- Insert/query round-trip: all fields return correctly
- Labels: junction table works, nested query returns label details
- Task links: relationship query returns linked task titles
- Cascade deletes: removing a task cascades to junction tables
- RLS enabled with permissive policies (single user system)
- Auto-updating `updated_at` trigger on tasks table

### Tech decisions

1. Shared Supabase instance with Morning Brew (REST API, publishable key)
2. Labels table instead of project column (user-requested flexibility)
3. Priority 0-4 mapping from Todoist's 1-4 system

## Eval impact

No product-level evals measurable yet. FR-001c (schema readiness) verified via round-trip tests.

## Unblocked

- AI-vnv: Build Todoist export + migration script
