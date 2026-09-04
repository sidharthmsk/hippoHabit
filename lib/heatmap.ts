import { addDays, dayOfWeek } from "./timezone";

export type HeatmapCell = {
  date: string;
  done: boolean;
  inRange: boolean;
};

export type HeatmapWeek = {
  cells: HeatmapCell[];
  monthLabel: string | null;
};

const WEEKS = 53;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** GitHub-style 53-week grid. Sunday is the first row. Last column is the current week. */
export function buildHeatmap(
  daysDone: Iterable<string>,
  today: string,
): HeatmapWeek[] {
  const done = daysDone instanceof Set ? daysDone : new Set(daysDone);
  const todayDow = dayOfWeek(today);
  const todayIndex = (WEEKS - 1) * 7 + todayDow;
  const weeks: HeatmapWeek[] = [];

  for (let w = 0; w < WEEKS; w++) {
    const cells: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const date = addDays(today, idx - todayIndex);
      cells.push({
        date,
        done: done.has(date),
        inRange: date <= today,
      });
    }
    const firstOfMonth = cells.find((c) => c.date.endsWith("-01") && c.inRange);
    weeks.push({
      cells,
      monthLabel: firstOfMonth
        ? MONTHS[Number(firstOfMonth.date.slice(5, 7)) - 1]
        : null,
    });
  }

  return weeks;
}
