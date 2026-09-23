import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { materializeDisplayOrder } from "../order";
import { parsePriority } from "../priority";
import * as schema from "./schema";

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tags_name_unique ON tags(name);

CREATE TABLE IF NOT EXISTS habit_tags (
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (habit_id, tag_id)
);

CREATE TABLE IF NOT EXISTS checkins (
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  PRIMARY KEY (habit_id, day)
);
`;

const SCHEMA_VERSION = 3;

declare global {
  var __habitDb: ReturnType<typeof createDb> | undefined;
  var __habitSchemaVersion: number | undefined;
}

function dbPath() {
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return path.resolve(/* turbopackIgnore: true */ fromEnv);
  }
  return path.join(process.cwd(), "data", "habits.db");
}

function migrate(sqlite: InstanceType<typeof Database>) {
  const columns = sqlite
    .prepare("PRAGMA table_info(habits)")
    .all() as { name: string }[];
  if (!columns.some((column) => column.name === "priority")) {
    sqlite.exec(
      "ALTER TABLE habits ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'",
    );
  }

  const userVersion = sqlite.pragma("user_version", { simple: true }) as number;
  if (userVersion < 3) {
    const backfill = sqlite.transaction(() => {
      const groupRows = sqlite
        .prepare("SELECT id, name, sort_order AS sortOrder FROM groups")
        .all() as { id: string; name: string; sortOrder: number }[];
      const habitRows = sqlite
        .prepare(
          `SELECT id, name, group_id AS groupId, priority,
                  sort_order AS sortOrder, created_at AS createdAt
           FROM habits`,
        )
        .all() as {
        id: string;
        name: string;
        groupId: string | null;
        priority: string;
        sortOrder: number;
        createdAt: number;
      }[];

      const assigned = materializeDisplayOrder(
        groupRows,
        habitRows.map((row) => ({
          id: row.id,
          name: row.name,
          groupId: row.groupId,
          priority: parsePriority(row.priority),
          sortOrder: row.sortOrder,
          createdAt: row.createdAt,
        })),
      );

      const updateGroup = sqlite.prepare(
        "UPDATE groups SET sort_order = ? WHERE id = ?",
      );
      for (const row of assigned.groups) {
        updateGroup.run(row.sortOrder, row.id);
      }
      const updateHabit = sqlite.prepare(
        "UPDATE habits SET sort_order = ? WHERE id = ?",
      );
      for (const row of assigned.habits) {
        updateHabit.run(row.sortOrder, row.id);
      }
      sqlite.pragma("user_version = 3");
    });
    backfill();
  }
}

export function openDatabase(file: string) {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(SCHEMA_SQL);
  migrate(sqlite);
  return drizzle(sqlite, { schema });
}

function createDb() {
  return openDatabase(dbPath());
}

export function getDb() {
  if (
    !globalThis.__habitDb ||
    globalThis.__habitSchemaVersion !== SCHEMA_VERSION
  ) {
    globalThis.__habitDb = createDb();
    globalThis.__habitSchemaVersion = SCHEMA_VERSION;
  }
  return globalThis.__habitDb;
}

export type DatabaseClient = ReturnType<typeof getDb>;
