import { assertEquals } from "jsr:@std/assert@1";
import { addDays, copenhagenDay } from "./time.ts";

const hourAt = (iso: string) => copenhagenDay(new Date(iso)).hour;

Deno.test("summer day bounds are UTC+2", () => {
  const d = copenhagenDay(new Date("2026-07-14T13:00:00Z"));
  assertEquals(d.date, "2026-07-14");
  assertEquals(d.dayStartUtc, "2026-07-13T22:00:00.000Z");
  assertEquals(d.dayEndUtc, "2026-07-14T22:00:00.000Z");
});

Deno.test("winter day bounds are UTC+1", () => {
  const d = copenhagenDay(new Date("2026-12-01T14:00:00Z"));
  assertEquals(d.date, "2026-12-01");
  assertEquals(d.dayStartUtc, "2026-11-30T23:00:00.000Z");
  assertEquals(d.dayEndUtc, "2026-12-01T23:00:00.000Z");
});

Deno.test("DST end day (25 Oct 2026) is 25 hours long", () => {
  const d = copenhagenDay(new Date("2026-10-25T08:00:00Z"));
  assertEquals(d.dayStartUtc, "2026-10-24T22:00:00.000Z");
  assertEquals(d.dayEndUtc, "2026-10-25T23:00:00.000Z");
});

Deno.test("late UTC evening already counts as the next Copenhagen day", () => {
  assertEquals(copenhagenDay(new Date("2026-10-10T22:30:00Z")).date, "2026-10-11");
});

Deno.test("closeout pair (13:00/14:00 UTC): exactly one run reads 15", () => {
  assertEquals([hourAt("2026-07-14T13:00:00Z"), hourAt("2026-07-14T14:00:00Z")], [15, 16]);
  assertEquals([hourAt("2026-12-01T13:00:00Z"), hourAt("2026-12-01T14:00:00Z")], [14, 15]);
});

Deno.test("prewarmer pair (04:30/05:30 UTC): exactly one run reads 6", () => {
  assertEquals([hourAt("2026-07-14T04:30:00Z"), hourAt("2026-07-14T05:30:00Z")], [6, 7]);
  assertEquals([hourAt("2026-12-01T04:30:00Z"), hourAt("2026-12-01T05:30:00Z")], [5, 6]);
});

Deno.test("addDays crosses month and year ends", () => {
  assertEquals(addDays("2026-10-12", -3), "2026-10-09");
  assertEquals(addDays("2026-12-31", 1), "2027-01-01");
  assertEquals(addDays("2026-03-01", -1), "2026-02-28");
});
