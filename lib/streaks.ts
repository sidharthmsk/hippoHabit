import { addDays } from "./timezone";

export function currentStreak(daysDone: Iterable<string>, today: string): number {
  const done = daysDone instanceof Set ? daysDone : new Set(daysDone);
  const hasToday = done.has(today);
  let cursor = hasToday ? today : addDays(today, -1);
  if (!done.has(cursor)) return 0;
  let count = 0;
  while (done.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function longestStreak(daysDone: Iterable<string>): number {
  const sorted = [...new Set(daysDone)].sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === addDays(sorted[i - 1], 1)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}
