/**
 * Tests for the groom command — weekly backlog grooming.
 *
 * Hypothesis a36548e3: drain the undated-task pile in 20-30-task chunks.
 * Each undated task gets a proposal (drop / soon / later) that Michael
 * approves, overrides, or skips.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  proposeGroomAction,
  formatGroomMessage,
  parseGroomReply,
  parseGroomDate,
  type GroomItem,
  type ParsedGroomAction,
} from "./groom.ts";
import type { Task } from "../supabase.ts";

const today = "2026-04-24"; // Friday
const daysAgo = (n: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const mkTask = (overrides: Partial<Task> = {}): Task => ({
  task_type: null,
  created_by: "michael",
  review_state: null,
  snoozed_until: null,
  is_next: false,
  id: overrides.id ?? "t-1",
  title: overrides.title ?? "Some task",
  description: null,
  priority: overrides.priority ?? 3,
  status: "open",
  due_date: null,
  todoist_id: null,
  source_message_id: null,
  deferral_count: 0,
  created_at: overrides.created_at ?? `${daysAgo(30)}T00:00:00Z`,
  updated_at: overrides.updated_at ?? `${daysAgo(30)}T00:00:00Z`,
  ...overrides,
});

describe("proposeGroomAction", () => {
  it("proposes 'drop' for old low-priority tasks", () => {
    const task = mkTask({
      priority: 4,
      created_at: `${daysAgo(60)}T00:00:00Z`,
    });
    assert.equal(proposeGroomAction(task, today), "drop");
  });

  it("proposes 'soon' for high-priority tasks (p0, p1)", () => {
    assert.equal(proposeGroomAction(mkTask({ priority: 0 }), today), "soon");
    assert.equal(proposeGroomAction(mkTask({ priority: 1 }), today), "soon");
  });

  it("proposes 'soon' when the title signals urgency", () => {
    const task = mkTask({ title: "URGENT: fix the prod alert", priority: 2 });
    assert.equal(proposeGroomAction(task, today), "soon");
  });

  it("proposes 'later' for medium-priority stable tasks", () => {
    const task = mkTask({
      priority: 2,
      created_at: `${daysAgo(14)}T00:00:00Z`,
      title: "Refresh the onboarding deck",
    });
    assert.equal(proposeGroomAction(task, today), "later");
  });

  it("proposes 'drop' for very old p3 tasks (likely stale)", () => {
    const task = mkTask({
      priority: 3,
      created_at: `${daysAgo(90)}T00:00:00Z`,
    });
    assert.equal(proposeGroomAction(task, today), "drop");
  });
});

describe("parseGroomDate", () => {
  it("parses ISO dates", () => {
    assert.equal(parseGroomDate("2026-05-15", today), "2026-05-15");
  });

  it("parses short weekday names (next occurrence)", () => {
    // today is Friday 2026-04-24. "mon" → next Monday = 2026-04-27.
    assert.equal(parseGroomDate("mon", today), "2026-04-27");
    assert.equal(parseGroomDate("tue", today), "2026-04-28");
    assert.equal(parseGroomDate("fri", today), "2026-05-01"); // next Friday (not today)
  });

  it("parses relative shorthand (Nd, Nw, Nm)", () => {
    assert.equal(parseGroomDate("3d", today), "2026-04-27");
    assert.equal(parseGroomDate("1w", today), "2026-05-01");
    assert.equal(parseGroomDate("2w", today), "2026-05-08");
    assert.equal(parseGroomDate("1m", today), "2026-05-24");
  });

  it("returns null for unparseable tokens", () => {
    assert.equal(parseGroomDate("whenever", today), null);
    assert.equal(parseGroomDate("", today), null);
  });
});

describe("parseGroomReply", () => {
  const max = 5;

  it("parses a simple drop list", () => {
    const actions = parseGroomReply("1 drop, 2 drop, 3 drop", max, today);
    assert.deepEqual(actions, [
      { index: 1, action: "drop" },
      { index: 2, action: "drop" },
      { index: 3, action: "drop" },
    ]);
  });

  it("parses soon with a date", () => {
    const actions = parseGroomReply("2 soon:mon", max, today);
    assert.deepEqual(actions, [
      { index: 2, action: "soon", dueDate: "2026-04-27" },
    ]);
  });

  it("parses later with an ISO date", () => {
    const actions = parseGroomReply("3 later:2026-05-15", max, today);
    assert.deepEqual(actions, [
      { index: 3, action: "later", dueDate: "2026-05-15" },
    ]);
  });

  it("defaults soon to +3d, later to +2w when no date given", () => {
    const actions = parseGroomReply("1 soon, 2 later", max, today);
    assert.deepEqual(actions, [
      { index: 1, action: "soon", dueDate: "2026-04-27" }, // today + 3d
      { index: 2, action: "later", dueDate: "2026-05-08" }, // today + 2w
    ]);
  });

  it("parses keep and skip with no date", () => {
    const actions = parseGroomReply("1 keep, 2 skip", max, today);
    assert.deepEqual(actions, [
      { index: 1, action: "keep" },
      { index: 2, action: "skip" },
    ]);
  });

  it("mixes actions in one reply", () => {
    const actions = parseGroomReply(
      "1 drop, 2 soon:tue, 3 later:2026-06-01, 4 keep, 5 skip",
      max,
      today,
    );
    assert.equal(actions.length, 5);
    assert.equal(actions[0].action, "drop");
    assert.equal(actions[1].action, "soon");
    assert.equal(actions[1].dueDate, "2026-04-28");
    assert.equal(actions[2].action, "later");
    assert.equal(actions[2].dueDate, "2026-06-01");
    assert.equal(actions[3].action, "keep");
    assert.equal(actions[4].action, "skip");
  });

  it("ignores out-of-range indices", () => {
    const actions = parseGroomReply("99 drop", max, today);
    assert.deepEqual(actions, []);
  });

  it("tolerates extra whitespace and semicolons", () => {
    const actions = parseGroomReply("  1 drop ;  2 soon ", max, today);
    assert.equal(actions.length, 2);
    assert.equal(actions[0].action, "drop");
    assert.equal(actions[1].action, "soon");
  });

  it("is case-insensitive", () => {
    const actions = parseGroomReply("1 DROP, 2 SOON:FRI", max, today);
    assert.equal(actions[0].action, "drop");
    assert.equal(actions[1].action, "soon");
    assert.equal(actions[1].dueDate, "2026-05-01");
  });
});

describe("formatGroomMessage", () => {
  const items: GroomItem[] = [
    {
      index: 1,
      task: mkTask({ id: "t-1", title: "Old low-prio thing", priority: 4 }),
      proposed: "drop",
      ageDays: 60,
    },
    {
      index: 2,
      task: mkTask({ id: "t-2", title: "URGENT: fix alert", priority: 1 }),
      proposed: "soon",
      ageDays: 3,
    },
    {
      index: 3,
      task: mkTask({ id: "t-3", title: "Refresh deck", priority: 2 }),
      proposed: "later",
      ageDays: 14,
    },
  ];

  it("includes the trigger instructions and each numbered task", () => {
    const msg = formatGroomMessage(items, 80);
    assert.match(msg, /Old low-prio thing/);
    assert.match(msg, /URGENT: fix alert/);
    assert.match(msg, /Refresh deck/);
    assert.match(msg, /drop/);
    assert.match(msg, /soon/);
    assert.match(msg, /later/);
    assert.match(msg, /Reply\b/i);
    assert.match(msg, /80.*undated|undated.*80/i);
  });

  it("returns a clean message when there's nothing to groom", () => {
    const msg = formatGroomMessage([], 0);
    assert.match(msg, /nothing/i);
  });
});

describe("ParsedGroomAction type shape", () => {
  it("accepts all four action values", () => {
    const actions: ParsedGroomAction[] = [
      { index: 1, action: "drop" },
      { index: 2, action: "soon", dueDate: "2026-04-27" },
      { index: 3, action: "later", dueDate: "2026-05-08" },
      { index: 4, action: "keep" },
      { index: 5, action: "skip" },
    ];
    assert.equal(actions.length, 5);
  });
});
