import { assertEquals } from "jsr:@std/assert@1";
import { buildPayload, type SnapshotTask } from "./payload.ts";

const task = (id: string, priority = 2, due_date: string | null = null): SnapshotTask => ({
  id,
  title: `Task ${id}`,
  priority,
  due_date,
});

Deno.test("heads-up counts overdue and due today, and says the calendar is missing", () => {
  const p = buildPayload({
    date: "2026-10-12",
    yesterday: { date: "2026-10-09", summary: "Completed 4 tasks." },
    anchorGoal: "Close Carlsberg terms",
    overdue: [task("a", 1, "2026-10-08"), task("b", 2, "2026-10-09"), task("c", 3, "2026-10-10")],
    dueToday: [task("d", 0, "2026-10-12")],
    p0p1: [task("d", 0, "2026-10-12"), task("a", 1, "2026-10-08")],
  });
  assertEquals(p.headsup, [
    "Calendar not connected, so meetings are not listed.",
    "3 overdue tasks need triage.",
    "1 task due today.",
  ]);
  assertEquals(p.tasks.overdue.length, 3);
  assertEquals(p.tasks.p0_p1.map((t) => t.id), ["d", "a"]);
  assertEquals(p.yesterday?.date, "2026-10-09");
  assertEquals(p.anchor_goal, "Close Carlsberg terms");
});

Deno.test("an empty day says so, and never invents a goal or a schedule", () => {
  const p = buildPayload({ date: "2026-10-12", yesterday: null, anchorGoal: null, overdue: [], dueToday: [], p0p1: [] });
  assertEquals(p.headsup.at(-1), "Nothing due today.");
  assertEquals(p.anchor_goal, null);
  assertEquals(p.schedule, []);
  assertEquals(p.calendar_connected, false);
});

Deno.test("one overdue task reads in the singular", () => {
  const p = buildPayload({ date: "2026-10-12", yesterday: null, anchorGoal: null, overdue: [task("a", 3, "2026-10-10")], dueToday: [], p0p1: [] });
  assertEquals(p.headsup[1], "1 overdue task needs triage.");
});
