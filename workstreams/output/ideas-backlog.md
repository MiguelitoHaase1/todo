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

## Move all-day events to "Worth knowing" section below agenda
- **Status:** queued
- **Date added:** 2026-03-31
- **Problem statement:** All-day calendar events land in the timed timeline with a 00:00–23:59 span. The now-line gets stuck inside them all day, and they push the actual scheduled blocks down — making the brew feel broken on any day with an all-day event.
- **Proposed change:** Filter all-day events out of `buildTimeline()` in `render-morning-brew.ts`. Render them in a minimal "Worth knowing" section below the `.day-timeline` container. Title only — no checkboxes, time slots, or descriptions.
- **Target eval(s):** eval-003 (reflect and reshape in one flow)
- **Expected delta:** +0.1 — removes a daily friction point that degrades the glance experience on days with all-day events
- **Risks / counterarguments:** Low risk. All-day events are informational context, not actionable blocks. No one will miss them from the timeline. Only risk is edge cases where an event looks all-day but has meaningful start/end times.
- **Experiment design:** Modify `buildTimeline()` to detect and exclude all-day events. Add a "Worth knowing" HTML section after the timeline. Generate a brew with at least one all-day event. Verify: (1) now-line moves correctly through timed items, (2) all-day event appears in the new section below, (3) brew with no all-day events renders normally without an empty section.
- **Result:**
