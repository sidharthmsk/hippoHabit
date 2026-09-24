import { addDays, weekStart } from "./timezone";

/**
 * Streaks are counted in Monday-start weeks. A week counts when it has at
 * least one check-in; the current week never breaks a streak while it is
 * still in progress.
 */
export function currentStreak(daysDone: Iterable<string>, today: string): number {
  const weeks = weekSet(daysDone);
  let cursor = weekStart(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let count = 0;
  while (weeks.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -7);
  }
  return count;
}

export function longestStreak(daysDone: Iterable<string>): number {
  const sorted = [...weekSet(daysDone)].sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === addDays(sorted[i - 1], 7)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function weekSet(daysDone: Iterable<string>): Set<string> {
  const weeks = new Set<string>();
  for (const day of daysDone) weeks.add(weekStart(day));
  return weeks;
}
