# Experiment: Kanban PWA for Multi-Day Task Overview

**Date:** 2026-04-01
**Workstream:** processing
**Branch:** experiment/processing/2026-04-01-kanban-pwa-scaffold
**Status:** shipped
**Target eval:** eval-002

---

## Hypothesis

Building an always-on mobile surface for the 4-day task landscape removes the daily friction of LLM round-trips just to see what's coming up. Expected eval-002 delta: +0.4.

## Implementation

Created a self-contained PWA in `Products/todolist/pwa/` using vanilla JS + Supabase REST API (same endpoint pattern as the existing CLI's `supabase.ts`).

**Files changed (2 new files):**
- `Products/todolist/pwa/index.html` — Full PWA app (inline CSS + JS). 4 day-columns (today, tomorrow, +2, +3). Task cards show title + priority badge. Actions: drag between columns (reschedule), ✓ button (complete), ✕ button (delete). Optimistic UI with toast feedback. Falls back to demo data when Supabase is not configured.
- `Products/todolist/pwa/manifest.json` — PWA manifest enabling home-screen install on iOS/Android.

**Design decisions:**
- Single HTML file keeps deployment trivial — drop on any static host.
- No build step, no framework dependencies.
- `window.__SB_URL__` / `window.__SB_KEY__` pattern lets a server-side template or Vercel env inject credentials without committing secrets.
- Optimistic mutations (update local state → render → hit Supabase → revert on failure) keep interactions snappy on mobile.

## Tests

Pre-existing test failure in `src/commands/triage.test.ts` (missing `format.ts` import — not related to this workstream). No previously-passing tests were regressed by this change.

## Eval Impact (qualitative)

| Eval | Before | Expected after |
|------|--------|----------------|
| eval-002 (proposals acted on / proposals shown) | baseline not set | +0.4 once deployed and used daily |

The PWA doesn't directly surface "proposals" in the eval-002 sense, but it creates the persistent landscape view that makes proposal-driven suggestions meaningful — users can see context around a proposed reframe rather than reasoning blind.

## Next Steps / Remaining Activation Work

1. Deploy `pwa/` to Vercel (or any static host).
2. Inject `SUPABASE_URL` and `SUPABASE_KEY` (anon key) via Vercel environment variables, rendered into `index.html` at build time or served via a tiny edge function.
3. Measure: daily opens vs CLI invocations; drag/complete/delete actions taken.
4. Future hypotheses: real-time updates via Supabase Realtime subscriptions; task creation from the PWA; priority editing.
