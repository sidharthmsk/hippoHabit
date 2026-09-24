import { describe, expect, it } from "vitest";
import { currentStreak, longestStreak } from "@/lib/streaks";

// Friday. Its week runs Mon 2026-08-31 … Sun 2026-09-06.
const today = "2026-09-04";

describe("currentStreak", () => {
  it("counts consecutive weeks with at least one check-in", () => {
    expect(
      currentStreak(["2026-08-18", "2026-08-27", "2026-09-01"], today),
    ).toBe(3);
  });

  it("does not break while the current week is still empty", () => {
    expect(currentStreak(["2026-08-18", "2026-08-24"], today)).toBe(2);
  });

  it("counts multiple check-ins in one week once", () => {
    expect(
      currentStreak(["2026-08-31", "2026-09-01", "2026-09-02"], today),
    ).toBe(1);
  });

  it("breaks when a full week has no check-ins", () => {
    expect(currentStreak(["2026-08-10", "2026-09-01"], today)).toBe(1);
  });

  it("is 0 when last week and this week are both empty", () => {
    expect(currentStreak(["2026-08-20"], today)).toBe(0);
  });

  it("treats Sunday as the end of the week", () => {
    expect(currentStreak(["2026-08-30"], "2026-08-30")).toBe(1);
    expect(currentStreak(["2026-08-30"], "2026-08-31")).toBe(1);
  });

  it("is 0 with no checkins", () => {
    expect(currentStreak([], today)).toBe(0);
  });
});

describe("longestStreak", () => {
  it("finds the longest run of consecutive weeks", () => {
    expect(
      longestStreak([
        "2026-06-01",
        "2026-06-10",
        // gap: week of 2026-06-15
        "2026-06-22",
        "2026-07-01",
        "2026-07-12",
      ]),
    ).toBe(3);
  });

  it("is 0 when empty", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("crosses year boundaries", () => {
    expect(longestStreak(["2025-12-24", "2025-12-31", "2026-01-05"])).toBe(3);
  });
});
