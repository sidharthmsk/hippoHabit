import { describe, expect, it } from "vitest";
import { currentStreak, longestStreak } from "@/lib/streaks";

const today = "2026-09-04";

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(
      currentStreak(["2026-09-02", "2026-09-03", "2026-09-04"], today),
    ).toBe(3);
  });

  it("uses yesterday when today is still empty", () => {
    expect(currentStreak(["2026-09-02", "2026-09-03"], today)).toBe(2);
  });

  it("is 1 if only today is done after a gap", () => {
    expect(currentStreak(["2026-09-02", "2026-09-04"], today)).toBe(1);
  });

  it("is 0 if yesterday and today are both empty", () => {
    expect(currentStreak(["2026-09-02"], today)).toBe(0);
  });

  it("is 0 with no checkins", () => {
    expect(currentStreak([], today)).toBe(0);
  });
});

describe("longestStreak", () => {
  it("finds the longest consecutive run", () => {
    expect(
      longestStreak([
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-05",
        "2026-09-06",
        "2026-09-07",
        "2026-09-08",
      ]),
    ).toBe(4);
  });

  it("is 0 when empty", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("crosses month boundaries", () => {
    expect(longestStreak(["2026-08-31", "2026-09-01", "2026-09-02"])).toBe(3);
  });
});
