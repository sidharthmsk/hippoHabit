import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { checkins, groups, habits } from "./db/schema";
import { parsePriority, type Priority } from "./priority";
import { currentStreak, longestStreak } from "./streaks";
import { addDays, calendarDate, getAppTimezone, today } from "./timezone";
import type { Group, HabitDetail, HabitListItem, NavData } from "./types";

/** Days of history shown as checkboxes on list pages. */
export const VISIBLE_DAYS = 7;

export function listGroups(): Group[] {
  return getDb()
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .orderBy(asc(groups.sortOrder), asc(groups.name))
    .all();
}

export function getNavData(): NavData {
  return { groups: listGroups() };
}

type ListFilter = {
  archived?: boolean;
  groupId?: string;
  priority?: Priority;
};

/** Habits in display order: by group order, then the habit's own order. */
export function listHabits(filter: ListFilter = {}): HabitListItem[] {
  const db = getDb();
  const conditions = [
    filter.archived ? isNotNull(habits.archivedAt) : isNull(habits.archivedAt),
  ];
  if (filter.groupId) conditions.push(eq(habits.groupId, filter.groupId));
  if (filter.priority) conditions.push(eq(habits.priority, filter.priority));

  const rows = db
    .select()
    .from(habits)
    .where(and(...conditions))
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt))
    .all();
  if (rows.length === 0) return [];

  const groupRows = listGroups();
  const groupName = new Map(groupRows.map((g) => [g.id, g.name]));
  const groupRank = new Map(groupRows.map((g, i) => [g.id, i]));

  const daysByHabit = checkinsByHabit(rows.map((h) => h.id));
  const todayDay = today();
  const firstVisible = addDays(todayDay, -(VISIBLE_DAYS - 1));

  const items = rows.map((h): HabitListItem => {
    const days = daysByHabit.get(h.id) ?? [];
    return {
      id: h.id,
      name: h.name,
      groupId: h.groupId,
      groupName: h.groupId ? (groupName.get(h.groupId) ?? null) : null,
      priority: parsePriority(h.priority),
      archived: h.archivedAt != null,
      recent: days.filter((day) => day >= firstVisible),
      currentStreak: currentStreak(days, todayDay),
    };
  });

  // Array.sort is stable, so habits keep their own order inside a group.
  const rank = (item: HabitListItem) =>
    item.groupId == null
      ? Number.MAX_SAFE_INTEGER
      : (groupRank.get(item.groupId) ?? Number.MAX_SAFE_INTEGER - 1);
  return items.sort((a, b) => rank(a) - rank(b));
}

export function getHabit(id: string): HabitDetail | null {
  const db = getDb();
  const habit = db.select().from(habits).where(eq(habits.id, id)).get();
  if (!habit) return null;
  const group = habit.groupId ? getGroup(habit.groupId) : null;

  const all = db
    .select({ day: checkins.day })
    .from(checkins)
    .where(eq(checkins.habitId, id))
    .orderBy(asc(checkins.day))
    .all()
    .map((r) => r.day);

  const todayDay = today();
  const created = calendarDate(new Date(habit.createdAt), getAppTimezone());
  const start = all.length > 0 && all[0] < created ? all[0] : created;
  const daysSinceStart = daysBetween(start, todayDay) + 1;
  const window30 = Math.min(30, daysSinceStart);
  const since30 = addDays(todayDay, -(window30 - 1));
  const last30 = all.filter((day) => day >= since30 && day <= todayDay).length;
  const firstVisible = addDays(todayDay, -(VISIBLE_DAYS - 1));

  return {
    id: habit.id,
    name: habit.name,
    groupId: habit.groupId,
    groupName: group?.name ?? null,
    priority: parsePriority(habit.priority),
    archived: habit.archivedAt != null,
    recent: all.filter((day) => day >= firstVisible),
    allCheckins: all,
    currentStreak: currentStreak(all, todayDay),
    longestStreak: longestStreak(all),
    total: all.length,
    rate30: last30 / window30,
    rateAll: Math.min(1, all.length / daysSinceStart),
  };
}

export function getGroup(id: string): Group | null {
  const row = getDb()
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.id, id))
    .get();
  return row ?? null;
}

function checkinsByHabit(ids: string[]) {
  const rows = getDb()
    .select()
    .from(checkins)
    .where(inArray(checkins.habitId, ids))
    .all();
  const byHabit = new Map<string, string[]>();
  for (const row of rows) {
    const list = byHabit.get(row.habitId) ?? [];
    list.push(row.day);
    byHabit.set(row.habitId, list);
  }
  return byHabit;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}
