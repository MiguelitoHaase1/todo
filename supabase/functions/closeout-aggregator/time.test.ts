import { assertEquals } from "jsr:@std/assert@1";
import { copenhagenDay, isCloseoutHour } from "./time.ts";

Deno.test("summer: 13:30 UTC is 15:30 in Copenhagen", () => {
  const d = copenhagenDay(new Date("2026-07-14T13:30:00Z"));
  assertEquals(d.date, "2026-07-14");
  assertEquals(d.hour, 15);
  assertEquals(d.dayStartUtc, "2026-07-13T22:00:00.000Z");
  assertEquals(isCloseoutHour(d), true);
});

Deno.test("summer: the 14:30 UTC run is 16:30 local and skips", () => {
  assertEquals(isCloseoutHour(copenhagenDay(new Date("2026-07-14T14:30:00Z"))), false);
});

Deno.test("winter: 14:30 UTC is 15:30 in Copenhagen", () => {
  const d = copenhagenDay(new Date("2026-12-01T14:30:00Z"));
  assertEquals(d.date, "2026-12-01");
  assertEquals(d.hour, 15);
  assertEquals(d.dayStartUtc, "2026-11-30T23:00:00.000Z");
  assertEquals(isCloseoutHour(d), true);
});

Deno.test("winter: the 13:30 UTC run is 14:30 local and skips", () => {
  assertEquals(isCloseoutHour(copenhagenDay(new Date("2026-12-01T13:30:00Z"))), false);
});

Deno.test("late UTC evening already counts as the next Copenhagen day", () => {
  assertEquals(copenhagenDay(new Date("2026-10-10T22:30:00Z")).date, "2026-10-11");
});

Deno.test("the 15:00 schedule: 13:00 UTC in summer and 14:00 UTC in winter both land on 15", () => {
  assertEquals(isCloseoutHour(copenhagenDay(new Date("2026-07-14T13:00:00Z"))), true);
  assertEquals(isCloseoutHour(copenhagenDay(new Date("2026-12-01T14:00:00Z"))), true);
  assertEquals(isCloseoutHour(copenhagenDay(new Date("2026-07-14T14:00:00Z"))), false);
  assertEquals(isCloseoutHour(copenhagenDay(new Date("2026-12-01T13:00:00Z"))), false);
});
