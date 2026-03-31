# Ideas Backlog

Structured hypotheses for this workstream. Each entry follows the schema below.
The execution engine picks from this queue based on expected eval delta.

<!-- Template for new entries:

## [Idea Title]
- **Status:** queued
- **Date added:** YYYY-MM-DD
- **Problem statement:** What's wrong or suboptimal today?
- **Proposed change:** What specifically would we do?
- **Target eval(s):** Which eval(s) should this move, and in which direction?
- **Expected delta:** Estimated improvement on 0-1 scale
- **Risks / counterarguments:** What was raised during sparring?
- **Experiment design:** Minimum viable test to validate or reject
- **Result:** (filled after experiment runs)

-->

## Kanban PWA for multi-day task overview
- **Status:** queued
- **Date added:** 2026-03-31
- **Problem statement:** Checking the task landscape requires an LLM round-trip via the CLI every time — multiple times daily. There's no ambient, always-on surface to glance at upcoming days and take quick actions.
- **Proposed change:** Build a PWA that reads from the existing Supabase backend and renders a Kanban board with columns for today, tomorrow, +2 days, and +3 days. Supports lightweight mutations: complete, reschedule (drag between columns or tap), and delete. Deployed on Vercel, mobile-first. Scope can grow over time to include editing titles/descriptions — but V1 is read + complete/reschedule/delete only.
- **Target eval(s):** eval-002 (see the full landscape)
- **Expected delta:** 0.4 — currently no baseline, but this creates the primary surface for landscape visibility
- **Risks / counterarguments:** Stale reads (CLI mutation not reflected until refresh — mitigate with Supabase real-time or short polling). Scope creep (PWA grows into full editor — mitigate by shipping V1 with only 3 mutations, additional features are separate hypotheses). Maintenance overhead (mitigate with Vercel + Next.js near-zero ops).
- **Experiment design:** Next.js PWA on Vercel reading from existing `tasks` table. 4 day-columns (today through +3), task cards with title + priority. Actions: tap to complete, swipe/drag to reschedule, long-press to delete. Mobile-first, installable as PWA. Measure: daily opens and actions taken from PWA vs CLI.
- **Result:** (pending)
