import { asc, max, sql } from "drizzle-orm";
import type { DatabaseClient, DbOrTx } from "./db";
import { checkins, groups, habits } from "./db/schema";
import { findOrCreateGroup } from "./groups";
import { isPriority, type Priority } from "./priority";
import { isValidDay } from "./timezone";

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

export type BackupCheckin = {
  habitId: string;
  day: string;
};

export type BackupSnapshot = {
  version: 2;
  exportedAt?: string;
  groups: BackupGroup[];
  habits: BackupHabit[];
  checkins: BackupCheckin[];
};

export type ImportResult =
  | { format: "hippohabit"; habits: number }
  | { format: "beaver"; added: number; merged: number };

/** Rows per INSERT. Keeps each statement well under SQLite's variable limit. */
const CHUNK = 500;

/**
 * Import a file from either hippoHabit (replaces everything) or Beaver Habits
 * (merged into what is already here). The format is detected from the JSON.
 */
export function importFile(
  db: DatabaseClient,
  input: unknown,
  today: string,
): ImportResult {
  const value = typeof input === "string" ? parseJson(input) : input;
  if (isBeaverExport(value)) {
    return { format: "beaver", ...mergeBeaver(db, parseBeaver(value), today) };
  }
  const parsed = parseBackup(value);
  importSnapshot(db, parsed);
  return { format: "hippohabit", habits: parsed.habits.length };
}

export function parseBackup(input: unknown): BackupSnapshot {
  const value = typeof input === "string" ? parseJson(input) : input;
  if (!isRecord(value)) {
    throw new BackupError("Backup file is not valid JSON.");
  }
  // Version 1 also carried tags, which were never used; they are ignored.
  if (value.version !== 1 && value.version !== 2) {
    throw new BackupError("This backup file is not supported.");
  }

  const groupRows = asArray(value.groups, "groups").map(parseGroup);
  const habitRows = asArray(value.habits, "habits").map(parseHabit);
  const checkinRows = asArray(value.checkins, "checkins").map(parseCheckin);

  const groupIds = new Set(groupRows.map((row) => row.id));
  const habitIds = new Set(habitRows.map((row) => row.id));

  if (groupIds.size !== groupRows.length) {
    throw new BackupError("Backup has duplicate groups.");
  }
  if (habitIds.size !== habitRows.length) {
    throw new BackupError("Backup has duplicate habits.");
  }

  for (const habit of habitRows) {
    if (habit.groupId && !groupIds.has(habit.groupId)) {
      throw new BackupError("Backup refers to a missing group.");
    }
  }
  for (const checkin of checkinRows) {
    if (!habitIds.has(checkin.habitId)) {
      throw new BackupError("Backup refers to a missing habit.");
    }
  }

  return {
    version: 2,
    exportedAt:
      typeof value.exportedAt === "string" ? value.exportedAt : undefined,
    groups: groupRows,
    habits: habitRows,
    checkins: dedupeCheckins(checkinRows),
  };
}

export function exportSnapshot(db: DatabaseClient): BackupSnapshot {
  return {
    version: 2,
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
    tx.delete(habits).run();
    tx.delete(groups).run();

    for (const rows of chunks(parsed.groups)) tx.insert(groups).values(rows).run();
    for (const rows of chunks(parsed.habits)) tx.insert(habits).values(rows).run();
    for (const rows of chunks(parsed.checkins)) {
      tx.insert(checkins).values(rows).run();
    }
  });
}

/* ---------- Beaver Habits ---------- */

export type BeaverHabit = {
  id: string | null;
  name: string;
  group: string;
  starred: boolean;
  archived: boolean;
  days: string[];
};

/** Beaver exports are `{ habits: [{ name, records: [...] }], order?: [...] }` with no version. */
export function isBeaverExport(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.version === undefined &&
    Array.isArray(value.habits) &&
    value.habits.every((habit) => isRecord(habit) && Array.isArray(habit.records))
  );
}

export function parseBeaver(value: unknown): BeaverHabit[] {
  if (!isBeaverExport(value)) {
    throw new BackupError("This is not a Beaver Habits export.");
  }
  const order = Array.isArray(value.order)
    ? value.order.filter((id): id is string => typeof id === "string")
    : [];
  const rank = (id: string | null) => {
    const index = id ? order.indexOf(id) : -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };

  const parsed = (value.habits as Record<string, unknown>[])
    .filter((habit) => habit.status !== "soft_delete")
    .map((habit): BeaverHabit => {
      const name = requiredName(habit.name, "Beaver habit");
      const tags = Array.isArray(habit.tags) ? habit.tags : [];
      const days = (habit.records as unknown[]).flatMap((record) => {
        if (!isRecord(record) || typeof record.day !== "string") {
          throw new BackupError(`"${name}" has an invalid record.`);
        }
        if (!isValidDay(record.day)) {
          throw new BackupError(`"${name}" has an invalid date: ${record.day}.`);
        }
        return record.done === true ? [record.day] : [];
      });
      return {
        id: typeof habit.id === "string" ? habit.id : null,
        name: name.trim(),
        group: typeof tags[0] === "string" ? tags[0].trim() : "",
        starred: habit.star === true,
        archived: habit.status === "archive",
        days: [...new Set(days)],
      };
    });

  if (parsed.length === 0) {
    throw new BackupError("The Beaver Habits file has no habits.");
  }
  // Stable sort: habits missing from `order` keep their file order at the end.
  return parsed
    .map((habit, index) => ({ habit, index }))
    .sort((a, b) => rank(a.habit.id) - rank(b.habit.id) || a.index - b.index)
    .map(({ habit }) => habit);
}

/**
 * Add Beaver habits, or merge check-ins into an existing habit with the same
 * name (case-insensitive). Nothing already here is removed. Future days are
 * skipped.
 */
export function mergeBeaver(
  db: DatabaseClient,
  beaverHabits: BeaverHabit[],
  today: string,
): { added: number; merged: number } {
  let added = 0;
  let merged = 0;
  db.transaction((tx) => {
    let nextOrder =
      (tx.select({ value: max(habits.sortOrder) }).from(habits).get()?.value ??
        0) + 1;
    for (const beaver of beaverHabits) {
      const existing = tx
        .select({ id: habits.id })
        .from(habits)
        .where(sql`lower(${habits.name}) = ${beaver.name.toLowerCase()}`)
        .get();

      let habitId: string;
      if (existing) {
        habitId = existing.id;
        merged += 1;
      } else {
        habitId = crypto.randomUUID();
        const now = Date.now();
        tx.insert(habits)
          .values({
            id: habitId,
            name: beaver.name,
            groupId: findOrCreateGroup(tx, beaver.group),
            priority: beaver.starred ? "high" : "medium",
            sortOrder: nextOrder++,
            archivedAt: beaver.archived ? now : null,
            createdAt: now,
          })
          .run();
        added += 1;
      }

      const rows = beaver.days
        .filter((day) => day <= today)
        .map((day) => ({ habitId, day }));
      insertCheckins(tx, rows);
    }
  });
  return { added, merged };
}

function insertCheckins(db: DbOrTx, rows: BackupCheckin[]) {
  for (const chunk of chunks(rows)) {
    db.insert(checkins).values(chunk).onConflictDoNothing().run();
  }
}

/* ---------- helpers ---------- */

function* chunks<T>(rows: T[]): Generator<T[]> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    yield rows.slice(i, i + CHUNK);
  }
}

function dedupeCheckins(rows: BackupCheckin[]): BackupCheckin[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.habitId}\n${row.day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
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

function parseCheckin(value: unknown): BackupCheckin {
  if (!isRecord(value)) {
    throw new BackupError("Backup has an invalid check-in.");
  }
  if (typeof value.day !== "string" || !isValidDay(value.day)) {
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
