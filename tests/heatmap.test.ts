import { describe, expect, it } from "vitest";
import { buildHeatmap, weekdayRow } from "@/lib/heatmap";

describe("buildHeatmap", () => {
  it("puts today in the last column at the right weekday row", () => {
    const today = "2026-09-04";
    const weeks = buildHeatmap(["2026-09-04", "2026-09-01"], today);
    expect(weeks).toHaveLength(53);
    const last = weeks[52];
    expect(last.cells[weekdayRow(today)].date).toBe(today);
    expect(last.cells[weekdayRow(today)].done).toBe(true);
    expect(last.cells[weekdayRow(today)].inRange).toBe(true);
  });

  it("starts each column on Monday", () => {
    const weeks = buildHeatmap([], "2026-09-04");
    expect(weeks[52].cells[0].date).toBe("2026-08-31");
    expect(weeks[52].cells[6].date).toBe("2026-09-06");
  });

  it("marks future days in the current week as out of range", () => {
    const today = "2026-09-04";
    const weeks = buildHeatmap([], today);
    const last = weeks[52];
    const future = last.cells.filter((c) => c.date > today);
    expect(future.length).toBeGreaterThan(0);
    expect(future.every((c) => !c.inRange)).toBe(true);
  });

  it("labels the week that contains the first of a month", () => {
    const today = "2026-09-04";
    const weeks = buildHeatmap([], today);
    const september = weeks.find((w) =>
      w.cells.some((c) => c.date === "2026-09-01"),
    );
    expect(september?.monthLabel).toBe("Sep");
  });
});
