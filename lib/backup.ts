import { asc } from "drizzle-orm";
import type { DatabaseClient } from "./db";
import { checkins, groups, habitTags, habits, tags } from "./db/schema";
import { isPriority, type Priority } from "./priority";

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

export type BackupGroup = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: number;
};

export type BackupHabit = {
  id: string;
  name: string;
  groupId: string | null;
  priority: Priority;
  sortOrder: number;
  archivedAt: number | null;
  createdAt: number;
};

export type BackupTag = {
  id: string;
  name: string;
};

export type BackupHabitTag = {
  habitId: string;
  tagId: string;
};

export type BackupCheckin = {
  habitId: string;
  day: string;
};

export type BackupSnapshot = {
  version: 1;
  exportedAt?: string;
  groups: BackupGroup[];
  habits: BackupHabit[];
  tags: BackupTag[];
  habitTags: BackupHabitTag[];
  checkins: BackupCheckin[];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseBackup(input: unknown): BackupSnapshot {
  const value = typeof input === "string" ? parseJson(input) : input;
  if (!isRecord(value)) {
    throw new BackupError("Backup file is not valid JSON.");
  }
  if (value.version !== 1) {
    throw new BackupError("This backup file is not supported.");
  }

  const groupRows = asArray(value.groups, "groups").map(parseGroup);
  const habitRows = asArray(value.habits, "habits").map(parseHabit);
  const tagRows = asArray(value.tags, "tags").map(parseTag);
  const habitTagRows = asArray(value.habitTags, "habitTags").map(parseHabitTag);
  const checkinRows = asArray(value.checkins, "checkins").map(parseCheckin);

  const groupIds = new Set(groupRows.map((row) => row.id));
  const habitIds = new Set(habitRows.map((row) => row.id));
  const tagIds = new Set(tagRows.map((row) => row.id));

  if (groupIds.size !== groupRows.length) {
    throw new BackupError("Backup has duplicate groups.");
  }
  if (habitIds.size !== habitRows.length) {
    throw new BackupError("Backup has duplicate habits.");
  }
  if (tagIds.size !== tagRows.length) {
    throw new BackupError("Backup has duplicate tags.");
  }

  for (const habit of habitRows) {
    if (habit.groupId && !groupIds.has(habit.groupId)) {
      throw new BackupError("Backup refers to a missing group.");
    }
  }
  for (const link of habitTagRows) {
    if (!habitIds.has(link.habitId) || !tagIds.has(link.tagId)) {
      throw new BackupError("Backup refers to a missing tag or habit.");
    }
  }
  for (const checkin of checkinRows) {
    if (!habitIds.has(checkin.habitId)) {
      throw new BackupError("Backup refers to a missing habit.");
    }
  }

  return {
    version: 1,
    exportedAt:
      typeof value.exportedAt === "string" ? value.exportedAt : undefined,
    groups: groupRows,
    habits: habitRows,
    tags: tagRows,
    habitTags: habitTagRows,
    checkins: checkinRows,
  };
}

export function exportSnapshot(db: DatabaseClient): BackupSnapshot {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    groups: db
      .select()
      .from(groups)
      .orderBy(asc(groups.sortOrder), asc(groups.id))
      .all(),
    habits: db
      .select()
      .from(habits)
      .orderBy(asc(habits.sortOrder), asc(habits.id))
      .all()
      .map((row) => ({
        ...row,
        priority: isPriority(row.priority) ? row.priority : "medium",
      })),
    tags: db.select().from(tags).orderBy(asc(tags.name), asc(tags.id)).all(),
    habitTags: db
      .select()
      .from(habitTags)
      .orderBy(asc(habitTags.habitId), asc(habitTags.tagId))
      .all(),
    checkins: db
      .select()
      .from(checkins)
      .orderBy(asc(checkins.habitId), asc(checkins.day))
      .all(),
  };
}

export function importSnapshot(db: DatabaseClient, input: unknown): void {
  const parsed = parseBackup(input);
  db.transaction((tx) => {
    tx.delete(checkins).run();
    tx.delete(habitTags).run();
    tx.delete(habits).run();
    tx.delete(tags).run();
    tx.delete(groups).run();

    if (parsed.groups.length > 0) {
      tx.insert(groups).values(parsed.groups).run();
    }
    if (parsed.habits.length > 0) {
      tx.insert(habits).values(parsed.habits).run();
    }
    if (parsed.tags.length > 0) {
      tx.insert(tags).values(parsed.tags).run();
    }
    if (parsed.habitTags.length > 0) {
      tx.insert(habitTags).values(parsed.habitTags).run();
    }
    if (parsed.checkins.length > 0) {
      tx.insert(checkins).values(parsed.checkins).run();
    }
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new BackupError("Backup file is not valid JSON.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new BackupError(`Backup is missing ${label}.`);
  }
  return value;
}

function parseGroup(value: unknown): BackupGroup {
  if (!isRecord(value)) {
    throw new BackupError("Backup has an invalid group.");
  }
  return {
    id: requiredId(value.id, "group"),
    name: requiredName(value.name, "group"),
    sortOrder: requiredInt(value.sortOrder, "group"),
    createdAt: requiredInt(value.createdAt, "group"),
  };
}

function parseHabit(value: unknown): BackupHabit {
  if (!isRecord(value)) {
    throw new BackupError("Backup has an invalid habit.");
  }
  if (typeof value.priority !== "string" || !isPriority(value.priority)) {
    throw new BackupError("Backup has an invalid habit priority.");
  }
  const groupId = value.groupId;
  if (groupId !== null && typeof groupId !== "string") {
    throw new BackupError("Backup has an invalid habit group.");
  }
  if (typeof groupId === "string" && groupId.length === 0) {
    throw new BackupError("Backup has an invalid habit group.");
  }
  const archivedAt = value.archivedAt;
  if (archivedAt !== null && !isFiniteInt(archivedAt)) {
    throw new BackupError("Backup has an invalid habit.");
  }
  return {
    id: requiredId(value.id, "habit"),
    name: requiredName(value.name, "habit"),
    groupId,
    priority: value.priority,
    sortOrder: requiredInt(value.sortOrder, "habit"),
    archivedAt,
    createdAt: requiredInt(value.createdAt, "habit"),
  };
}

function parseTag(value: unknown): BackupTag {
  if (!isRecord(value)) {
    throw new BackupError("Backup has an invalid tag.");
  }
  return {
    id: requiredId(value.id, "tag"),
    name: requiredName(value.name, "tag"),
  };
}

function parseHabitTag(value: unknown): BackupHabitTag {
  if (!isRecord(value)) {
    throw new BackupError("Backup has an invalid tag link.");
  }
  return {
    habitId: requiredId(value.habitId, "tag link"),
    tagId: requiredId(value.tagId, "tag link"),
  };
}

function parseCheckin(value: unknown): BackupCheckin {
  if (!isRecord(value)) {
    throw new BackupError("Backup has an invalid check-in.");
  }
  if (typeof value.day !== "string" || !DAY.test(value.day)) {
    throw new BackupError("Backup has an invalid check-in date.");
  }
  return {
    habitId: requiredId(value.habitId, "check-in"),
    day: value.day,
  };
}

function requiredId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BackupError(`Backup has an invalid ${label}.`);
  }
  return value;
}

function requiredName(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BackupError(`Backup has an invalid ${label}.`);
  }
  return value;
}

function requiredInt(value: unknown, label: string): number {
  if (!isFiniteInt(value)) {
    throw new BackupError(`Backup has an invalid ${label}.`);
  }
  return value;
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
