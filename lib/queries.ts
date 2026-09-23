import { and, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { checkins, groups, habits } from "./db/schema";
import { compareManual, sectionRank } from "./order";
import { parsePriority, type Priority } from "./priority";
import { currentStreak, longestStreak } from "./streaks";
import { today } from "./timezone";
import type { Group, HabitDetail, HabitListItem, NavData } from "./types";

export function listGroups(): Group[] {
  const db = getDb();
  return db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .orderBy(groups.sortOrder, groups.id)
    .all();
}

export function getNavData(): NavData {
  return { groups: listGroups() };
}

type ListFilter = {
  archived?: boolean;
  groupId?: string;
  priority?: Priority;
  sinceDay?: string;
};

export function listHabits(filter: ListFilter = {}): HabitListItem[] {
  const db = getDb();
  const archived = filter.archived ?? false;

  const rows = db
    .select()
    .from(habits)
    .where(archived ? isNotNull(habits.archivedAt) : isNull(habits.archivedAt))
    .orderBy(habits.sortOrder, habits.createdAt)
    .all();

  let filtered = rows;
  if (filter.groupId) {
    filtered = filtered.filter((h) => h.groupId === filter.groupId);
  }
  if (filter.priority) {
    filtered = filtered.filter((h) => parsePriority(h.priority) === filter.priority);
  }

  const ids = filtered.map((h) => h.id);
  if (ids.length === 0) return [];

  const groupRows = listGroups();
  const groupById = new Map(groupRows.map((g) => [g.id, g.name]));
  const groupIndex = new Map(groupRows.map((g, index) => [g.id, index]));
  filtered.sort((a, b) => {
    const rank =
      sectionRank(a.groupId, groupIndex, groupRows.length) -
      sectionRank(b.groupId, groupIndex, groupRows.length);
    if (rank !== 0) return rank;
    return compareManual(a, b);
  });

  const checkinQuery = db
    .select()
    .from(checkins)
    .where(
      filter.sinceDay
        ? and(
            inArray(checkins.habitId, ids),
            gte(checkins.day, filter.sinceDay),
          )
        : inArray(checkins.habitId, ids),
    )
    .all();

  const checkinsByHabit = new Map<string, string[]>();
  for (const row of checkinQuery) {
    const list = checkinsByHabit.get(row.habitId) ?? [];
    list.push(row.day);
    checkinsByHabit.set(row.habitId, list);
  }

  const todayDay = today();

  return filtered.map((h) => {
    const days = checkinsByHabit.get(h.id) ?? [];
    return {
      id: h.id,
      name: h.name,
      groupId: h.groupId,
      groupName: h.groupId ? (groupById.get(h.groupId) ?? null) : null,
      priority: parsePriority(h.priority),
      archived: h.archivedAt != null,
      checkins: days,
      currentStreak: currentStreak(days, todayDay),
    };
  });
}

export function getHabit(id: string): HabitDetail | null {
  const db = getDb();
  const habit = db.select().from(habits).where(eq(habits.id, id)).get();
  if (!habit) return null;

  const [item] = listHabits({
    archived: habit.archivedAt != null,
  }).filter((h) => h.id === id);
  if (!item) return null;

  const all = db
    .select({ day: checkins.day })
    .from(checkins)
    .where(eq(checkins.habitId, id))
    .all()
    .map((r) => r.day);

  return {
    ...item,
    checkins: all,
    allCheckins: all,
    currentStreak: currentStreak(all, today()),
    longestStreak: longestStreak(all),
  };
}

export function getGroup(id: string): Group | null {
  const db = getDb();
  const row = db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.id, id))
    .get();
  return row ?? null;
}
