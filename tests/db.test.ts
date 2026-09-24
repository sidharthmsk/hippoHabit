import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hippohabit-"));
  dirs.push(dir);
  return path.join(dir, "habits.db");
}

describe("openDatabase migrations", () => {
  it("creates a fresh database at the latest version", () => {
    const file = tempFile();
    openDatabase(file);
    const sqlite = new Database(file);
    expect(sqlite.pragma("user_version", { simple: true })).toBe(4);
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(["checkins", "groups", "habits"]);
  });

  it("upgrades a pre-versioning database without losing data", () => {
    const file = tempFile();
    const old = new Database(file);
    old.exec(`
      CREATE TABLE groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
      CREATE TABLE habits (id TEXT PRIMARY KEY, name TEXT NOT NULL, group_id TEXT, sort_order INTEGER NOT NULL DEFAULT 0, archived_at INTEGER, created_at INTEGER NOT NULL);
      CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE habit_tags (habit_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY (habit_id, tag_id));
      CREATE TABLE checkins (habit_id TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (habit_id, day));
      INSERT INTO habits (id, name, sort_order, created_at) VALUES ('a', 'Zebra', 5, 1), ('b', 'Apple', 9, 2);
      INSERT INTO checkins VALUES ('a', '2026-09-01');
    `);
    old.close();

    openDatabase(file);
    const sqlite = new Database(file);
    expect(sqlite.pragma("user_version", { simple: true })).toBe(4);
    const habits = sqlite
      .prepare("SELECT id, priority, sort_order FROM habits ORDER BY sort_order")
      .all();
    // Old lists sorted by priority, then name.
    expect(habits).toEqual([
      { id: "b", priority: "medium", sort_order: 1 },
      { id: "a", priority: "medium", sort_order: 2 },
    ]);
    expect(sqlite.prepare("SELECT count(*) AS n FROM checkins").get()).toEqual({ n: 1 });
    expect(
      sqlite.prepare("SELECT name FROM sqlite_master WHERE name = 'tags'").get(),
    ).toBeUndefined();
  });
});
