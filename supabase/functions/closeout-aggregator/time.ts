// Copenhagen wall-clock helpers. pg_cron on this project (1.6.4) has no
// timezone argument and runs in UTC, so the job fires at 13:00 and 14:00 UTC
// and the function only does work in the run where Copenhagen reads 15:xx.
// That keeps 15:00 local across both sides of daylight saving.

export const TZ = "Europe/Copenhagen";

export type LocalDay = {
  date: string; // YYYY-MM-DD in Copenhagen
  hour: number; // 0-23 in Copenhagen
  dayStartUtc: string; // ISO instant of local midnight
};

export function copenhagenDay(now: Date): LocalDay {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      timeZoneName: "longOffset",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  // "GMT+02:00" -> "+02:00"; plain "GMT" means a zero offset.
  const offset = parts.timeZoneName.replace("GMT", "") || "+00:00";
  return {
    date,
    hour: Number(parts.hour),
    dayStartUtc: new Date(`${date}T00:00:00${offset}`).toISOString(),
  };
}

export function isCloseoutHour(day: LocalDay): boolean {
  return day.hour === 15;
}
