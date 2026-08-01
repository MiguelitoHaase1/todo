# Experiment: Move all-day events to "Worth knowing" section

- **Date:** 2026-04-02
- **Workstream:** output
- **Status:** shipped
- **Target eval:** eval-003 (reflect and reshape in one flow)

## Problem

All-day calendar events landed in the timed timeline. The now-line got stuck inside them all day. Scheduled blocks were pushed down. The brew felt broken on any day with an all-day event.

## Change

Three edits to `Me/Productivity/chief-of-staff/src/render-morning-brew.ts`:

1. **`isAllDay(event)`** — exported helper. Returns `true` if `event.start` contains no `T` (date-only string, matching Google Calendar API convention for all-day events).

2. **`buildTimeline()` filter** — skips events where `isAllDay()` is true. One line added.

3. **`renderWorthKnowing(plan)`** — collects filtered all-day events, renders a `<div data-testid="worth-knowing">` section with an `<h2>Worth knowing</h2>` header and a plain list of titles. Returns empty string when no all-day events, so no empty section appears on clean days.

CSS added: `.worth-knowing`, `.worth-knowing-list`, `.worth-knowing-item` — matches visual identity (cream background, Inter font, coral accent omitted since this is informational not actionable).

## Test results

7 tests written (TDD), all pass:

- `isAllDay` returns true for date-only strings
- `isAllDay` returns false for datetime strings (with and without timezone)
- All-day events excluded from timeline chunk
- All-day events present in "Worth knowing" chunk
- No "Worth knowing" section rendered when no all-day events
- Normal timed events still render correctly

## Eval delta

- **eval-003** (reflect and reshape in one flow): expected +0.1. Removes daily friction — brew no longer looks broken on days with all-day events. Actual measurement pending live usage.

## Files changed

| File | Change |
|------|--------|
| `Me/Productivity/chief-of-staff/src/render-morning-brew.ts` | isAllDay + buildTimeline filter + renderWorthKnowing + CSS + template injection |
| `Me/Productivity/chief-of-staff/src/render-morning-brew.test.ts` | New: 7 tests |
| `Me/Productivity/chief-of-staff/package.json` | New: npm test script using node --experimental-transform-types |
| `Products/todolist/workstreams/output/ideas-backlog.md` | Status → shipped, result filled |
