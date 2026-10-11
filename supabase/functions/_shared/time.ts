// Copenhagen wall-clock helpers. pg_cron on this project (1.6.4) has no
// timezone argument and runs in UTC. Each scheduled job therefore fires at a
// UTC pair one hour apart (summer and winter offset), and the function keeps
// only the run where Copenhagen reads the target hour. That pins the local
// time across both sides of daylight saving.

export const TZ = "Europe/Copenhagen";

export type LocalDay = {
  date: string; // YYYY-MM-DD in Copenhagen
  hour: number; // 0-23 in Copenhagen
  dayStartUtc: string; // ISO instant of local midnight
  dayEndUtc: string; // ISO instant of the next local midnight
};

function offsetAt(now: Date): string {
  const name = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")!.value;
  // "GMT+02:00" -> "+02:00"; plain "GMT" means a zero offset.
  return name.replace("GMT", "") || "+00:00";
}

// Offset is read at 00:00 UTC on that date: within two hours of local
// midnight and before the 01:00 UTC moment EU clocks change, so it is the
// offset that was in force at local midnight.
function localMidnightUtc(date: string): string {
  return new Date(`${date}T00:00:00${offsetAt(new Date(`${date}T00:00:00Z`))}`).toISOString();
}

export function copenhagenDay(now: Date): LocalDay {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const nextDate = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day + 1)).toISOString().slice(0, 10);
  return {
    date,
    hour: Number(parts.hour),
    dayStartUtc: localMidnightUtc(date),
    dayEndUtc: localMidnightUtc(nextDate),
  };
}
