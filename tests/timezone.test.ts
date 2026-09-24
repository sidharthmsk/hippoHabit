import { describe, expect, it } from "vitest";
import {
  addDays,
  calendarDate,
  dayOfWeek,
  isValidDay,
  weekStart,
  recentDays,
} from "@/lib/timezone";

describe("calendarDate", () => {
  it("uses the calendar date in the given timezone, not UTC", () => {
    const lateUtc = new Date("2026-09-04T23:30:00Z");
    expect(calendarDate(lateUtc, "UTC")).toBe("2026-09-04");
    expect(calendarDate(lateUtc, "Asia/Tokyo")).toBe("2026-09-05");
  });
});

describe("addDays", () => {
  it("adds calendar days across months", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("recentDays", () => {
  it("returns count days ending today in the timezone", () => {
    const days = recentDays(3, "UTC");
    expect(days).toHaveLength(3);
    expect(days[2]).toBe(calendarDate(new Date(), "UTC"));
    expect(days[0]).toBe(addDays(days[2], -2));
  });
});

describe("dayOfWeek", () => {
  it("is 0 for Sunday", () => {
    expect(dayOfWeek("2026-09-06")).toBe(0);
    expect(dayOfWeek("2026-09-04")).toBe(5);
  });
});

describe("weekStart", () => {
  it("returns the Monday of the week", () => {
    expect(weekStart("2026-09-04")).toBe("2026-08-31");
    expect(weekStart("2026-08-31")).toBe("2026-08-31");
    expect(weekStart("2026-09-06")).toBe("2026-08-31");
  });
});

describe("isValidDay", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidDay("2024-02-29")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("2026-13-01")).toBe(false);
    expect(isValidDay("09/04/2026")).toBe(false);
  });
});
