import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BackupError,
  exportSnapshot,
  importSnapshot,
  parseBackup,
} from "@/lib/backup";
import { openDatabase } from "@/lib/db";
import seed from "./fixtures/seed.json";

function memoryDb() {
  return openDatabase(":memory:");
}

const seedJson = readFileSync(
  new URL("./fixtures/seed.json", import.meta.url),
  "utf8",
);

describe("parseBackup", () => {
  it("accepts the seed fixture", () => {
    const parsed = parseBackup(seedJson);
    expect(parsed.version).toBe(1);
    expect(parsed.habits.map((habit) => habit.name)).toEqual([
      "Run",
      "Read",
      "Floss",
      "Old journal",
    ]);
    expect(parsed.checkins).toHaveLength(6);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseBackup("{")).toThrow(BackupError);
  });

  it("rejects an unsupported version", () => {
    expect(() => parseBackup({ ...seed, version: 99 })).toThrow(BackupError);
  });

  it("rejects a check-in that is not a calendar day", () => {
    expect(() =>
      parseBackup({
        ...seed,
        checkins: [{ habitId: "h-run", day: "09/04/2026" }],
      }),
    ).toThrow(BackupError);
  });

  it("rejects a check-in for a habit that is not in the file", () => {
    expect(() =>
      parseBackup({
        ...seed,
        checkins: [{ habitId: "missing", day: "2026-09-04" }],
      }),
    ).toThrow(BackupError);
  });
});

describe("exportSnapshot", () => {
  it("exports an empty database as version 1 with empty collections", () => {
    const snapshot = exportSnapshot(memoryDb());
    expect(snapshot.version).toBe(1);
    expect(snapshot.groups).toEqual([]);
    expect(snapshot.habits).toEqual([]);
    expect(snapshot.tags).toEqual([]);
    expect(snapshot.habitTags).toEqual([]);
    expect(snapshot.checkins).toEqual([]);
  });
});

describe("importSnapshot", () => {
  it("loads seed data so a later export matches the fixture", () => {
    const db = memoryDb();
    importSnapshot(db, parseBackup(seedJson));
    const snapshot = exportSnapshot(db);

    expect(snapshot.groups).toEqual(seed.groups);
    expect(snapshot.habits).toEqual(seed.habits);
    expect(snapshot.tags).toEqual(seed.tags);
    expect(snapshot.habitTags).toEqual(seed.habitTags);
    expect(snapshot.checkins).toEqual(seed.checkins);
  });

  it("replaces whatever was already in the database", () => {
    const db = memoryDb();
    importSnapshot(db, parseBackup(seedJson));
    importSnapshot(db, {
      version: 1,
      groups: [],
      habits: [
        {
          id: "h-only",
          name: "Only",
          groupId: null,
          priority: "high",
          sortOrder: 0,
          archivedAt: null,
          createdAt: 1,
        },
      ],
      tags: [],
      habitTags: [],
      checkins: [{ habitId: "h-only", day: "2026-01-01" }],
    });

    const snapshot = exportSnapshot(db);
    expect(snapshot.habits.map((habit) => habit.name)).toEqual(["Only"]);
    expect(snapshot.groups).toEqual([]);
    expect(snapshot.tags).toEqual([]);
    expect(snapshot.checkins).toEqual([
      { habitId: "h-only", day: "2026-01-01" },
    ]);
  });

  it("leaves existing data untouched when the payload is invalid", () => {
    const db = memoryDb();
    importSnapshot(db, parseBackup(seedJson));

    expect(() =>
      importSnapshot(db, {
        version: 1,
        groups: seed.groups,
        habits: seed.habits,
        tags: seed.tags,
        habitTags: seed.habitTags,
        checkins: [{ habitId: "h-run", day: "not-a-day" }],
      }),
    ).toThrow(BackupError);

    expect(exportSnapshot(db).habits.map((habit) => habit.name)).toEqual([
      "Run",
      "Read",
      "Floss",
      "Old journal",
    ]);
    expect(exportSnapshot(db).checkins).toHaveLength(6);
  });
});
