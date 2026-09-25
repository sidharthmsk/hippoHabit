import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type Sqlite = InstanceType<typeof Database>;

/**
 * Ordered migrations. `PRAGMA user_version` records how many have run, so
 * each one runs exactly once. Databases created before versioning existed
 * report 0, so the early steps must tolerate tables that already exist.
 */
const MIGRATIONS: ((sqlite: Sqlite) => void)[] = [
  (sqlite) => {
    sqlite.exec(`
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
        sort_order INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS checkins (
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        day TEXT NOT NULL,
        PRIMARY KEY (habit_id, day)
      );
    `);
  },
  (sqlite) => {
    if (!hasColumn(sqlite, "habits", "priority")) {
      sqlite.exec(
        "ALTER TABLE habits ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'",
      );
    }
  },
  (sqlite) => {
    sqlite.exec(`
      DROP TABLE IF EXISTS habit_tags;
      DROP TABLE IF EXISTS tags;
    `);
  },
  (sqlite) => {
    // Lists used to sort by priority then name inside each group. Seed
    // sort_order with that order so switching to manual ordering keeps
    // every list looking the same.
    const rows = sqlite
      .prepare(
        `SELECT id FROM habits
         ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'low' THEN 2 ELSE 1 END,
                  name COLLATE NOCASE, created_at`,
      )
      .all() as { id: string }[];
    const update = sqlite.prepare("UPDATE habits SET sort_order = ? WHERE id = ?");
    rows.forEach((row, index) => update.run(index + 1, row.id));
  },
  (sqlite) => {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
];

function hasColumn(sqlite: Sqlite, table: string, column: string): boolean {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return columns.some((c) => c.name === column);
}

function migrate(sqlite: Sqlite) {
  const current = sqlite.pragma("user_version", { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
    sqlite.transaction(() => {
      MIGRATIONS[version](sqlite);
      sqlite.pragma(`user_version = ${version + 1}`);
    })();
  }
}

declare global {
  var __habitDb: ReturnType<typeof openDatabase> | undefined;
}

function dbPath() {
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return path.resolve(/* turbopackIgnore: true */ fromEnv);
  }
  return path.join(process.cwd(), "data", "habits.db");
}

export function openDatabase(file: string) {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  migrate(sqlite);
  return drizzle(sqlite, { schema });
}

export function getDb() {
  // Cached on globalThis so dev-mode module reloads reuse one connection.
  globalThis.__habitDb ??= openDatabase(dbPath());
  return globalThis.__habitDb;
}

export type DatabaseClient = ReturnType<typeof getDb>;
/** A connection or an open transaction; both expose the same query builders. */
export type DbOrTx =
  | DatabaseClient
  | Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];
