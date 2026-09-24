import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BackupError,
  exportSnapshot,
  importSnapshot,
  importFile,
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
    expect(parsed.version).toBe(2);
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

  it("rejects an impossible calendar day", () => {
    expect(() =>
      parseBackup({
        ...seed,
        checkins: [{ habitId: "h-run", day: "2026-02-30" }],
      }),
    ).toThrow(BackupError);
  });

  it("drops duplicate check-ins instead of failing", () => {
    const parsed = parseBackup({
      ...seed,
      checkins: [
        { habitId: "h-run", day: "2026-09-01" },
        { habitId: "h-run", day: "2026-09-01" },
      ],
    });
    expect(parsed.checkins).toHaveLength(1);
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
  it("exports an empty database as version 2 with empty collections", () => {
    const snapshot = exportSnapshot(memoryDb());
    expect(snapshot.version).toBe(2);
    expect(snapshot.groups).toEqual([]);
    expect(snapshot.habits).toEqual([]);
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

describe("large imports", () => {
  it("imports more check-ins than fit in one SQL statement", () => {
    const db = memoryDb();
    const days: string[] = [];
    for (let i = 0; i < 2500; i++) {
      days.push(new Date(Date.UTC(2019, 0, 1 + i)).toISOString().slice(0, 10));
    }
    const habitsList = Array.from({ length: 10 }, (_, i) => ({
      id: `h-${i}`,
      name: `Habit ${i}`,
      groupId: null,
      priority: "medium",
      sortOrder: i,
      archivedAt: null,
      createdAt: 1,
    }));
    const checkinsList = habitsList.flatMap((habit) =>
      days.map((day) => ({ habitId: habit.id, day })),
    );
    importSnapshot(db, {
      version: 2,
      groups: [],
      habits: habitsList,
      checkins: checkinsList,
    });
    expect(exportSnapshot(db).checkins).toHaveLength(25000);
  });
});

describe("Beaver Habits import", () => {
  const beaver = {
    habits: [
      {
        id: "b1",
        name: "Read",
        tags: ["Mind"],
        star: true,
        records: [
          { day: "2026-09-01", done: true },
          { day: "2026-09-02", done: false },
          { day: "2026-09-03", done: true, text: "chapter 4" },
        ],
      },
      {
        id: "b2",
        name: "Stretch",
        status: "archive",
        records: [{ day: "2026-08-30", done: true }],
      },
      {
        id: "b3",
        name: "Deleted one",
        status: "soft_delete",
        records: [{ day: "2026-08-30", done: true }],
      },
      {
        id: "b4",
        name: "Future",
        records: [{ day: "2099-01-01", done: true }],
      },
    ],
    order: ["b2", "b1"],
  };

  it("adds new habits with their done days, group, and star", () => {
    const db = memoryDb();
    const result = importFile(db, JSON.stringify(beaver), "2026-09-04");
    expect(result).toEqual({ format: "beaver", added: 3, merged: 0 });

    const snapshot = exportSnapshot(db);
    expect(snapshot.habits.map((h) => h.name)).toEqual([
      "Stretch",
      "Read",
      "Future",
    ]);
    const read = snapshot.habits.find((h) => h.name === "Read")!;
    expect(read.priority).toBe("high");
    expect(snapshot.groups.map((g) => g.name)).toEqual(["Mind"]);
    expect(read.groupId).toBe(snapshot.groups[0].id);
    expect(
      snapshot.habits.find((h) => h.name === "Stretch")!.archivedAt,
    ).not.toBeNull();
    expect(
      snapshot.checkins.filter((c) => c.habitId === read.id).map((c) => c.day),
    ).toEqual(["2026-09-01", "2026-09-03"]);
    // Future days are skipped.
    expect(snapshot.checkins).toHaveLength(3);
  });

  it("merges into an existing habit with the same name and keeps other data", () => {
    const db = memoryDb();
    importSnapshot(db, parseBackup(seedJson));
    const before = exportSnapshot(db);

    const result = importFile(
      db,
      {
        habits: [
          {
            name: "run",
            records: [
              { day: "2026-09-01", done: true },
              { day: "2026-07-01", done: true },
            ],
          },
        ],
      },
      "2026-09-04",
    );
    expect(result).toEqual({ format: "beaver", added: 0, merged: 1 });

    const after = exportSnapshot(db);
    expect(after.habits).toEqual(before.habits);
    const runDays = after.checkins
      .filter((c) => c.habitId === "h-run")
      .map((c) => c.day);
    expect(runDays).toContain("2026-07-01");
    expect(new Set(runDays).size).toBe(runDays.length);
  });

  it("rejects an invalid Beaver date", () => {
    expect(() =>
      importFile(
        memoryDb(),
        { habits: [{ name: "X", records: [{ day: "2026-99-01", done: true }] }] },
        "2026-09-04",
      ),
    ).toThrow(BackupError);
  });

  it("still detects hippoHabit backups", () => {
    const db = memoryDb();
    expect(importFile(db, seedJson, "2026-09-04")).toEqual({
      format: "hippohabit",
      habits: 4,
    });
  });
});
