export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE || "UTC";
}

export function calendarDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function today(timeZone = getAppTimezone()): string {
  return calendarDate(new Date(), timeZone);
}

/** Add `n` calendar days to a YYYY-MM-DD date. */
export function addDays(day: string, n: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, date + n));
  return dt.toISOString().slice(0, 10);
}

export function recentDays(count: number, timeZone = getAppTimezone()): string[] {
  const end = today(timeZone);
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(addDays(end, -i));
  }
  return days;
}

/** True for a real YYYY-MM-DD calendar date (rejects 2026-02-30). */
export function isValidDay(day: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && addDays(day, 0) === day;
}

/** Monday of the week containing `day`. */
export function weekStart(day: string): string {
  return addDays(day, -((dayOfWeek(day) + 6) % 7));
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD calendar date. */
export function dayOfWeek(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

export function formatDayHeading(day: string): { weekday: string; date: string } {
  const [year, month, date] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, date));
  return {
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(dt),
    date: String(date),
  };
}

export function formatLongDate(day: string, withYear = false): string {
  const [year, month, date] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, date));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(dt);
}
