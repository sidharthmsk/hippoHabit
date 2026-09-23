import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { applyArrangement } from "@/lib/arrange";
import { openDatabase } from "@/lib/db";
import { groups, habits } from "@/lib/db/schema";
import { OrderError } from "@/lib/order";

type Client = ReturnType<typeof openDatabase>;

function tempFile(): { dir: string; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hippo-order-"));
  return { dir, file: path.join(dir, "habits.db") };
}

function habitOrders(db: Client): Record<string, number> {
  return Object.fromEntries(
    db
      .select({ id: habits.id, sortOrder: habits.sortOrder })
      .from(habits)
      .all()
      .map((row) => [row.id, row.sortOrder]),
  );
}

function groupOrders(db: Client): Record<string, number> {
  return Object.fromEntries(
    db
      .select({ id: groups.id, sortOrder: groups.sortOrder })
      .from(groups)
      .all()
      .map((row) => [row.id, row.sortOrder]),
  );
}

describe("order migration", () => {
  it("rewrites an existing file once and leaves a later manual order alone", () => {
    const { dir, file } = tempFile();
    let open: Database.Database | null = null;
    try {
      const created = new Database(file);
      open = created;
      created.exec(`
        CREATE TABLE groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE habits (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'medium',
          sort_order INTEGER NOT NULL DEFAULT 0,
          archived_at INTEGER,
          created_at INTEGER NOT NULL
        );
      `);
      created
        .prepare(
          "INSERT INTO groups (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)",
        )
        .run("body", "Body", 1, 1);
      created
        .prepare(
          "INSERT INTO groups (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)",
        )
        .run("mind", "Mind", 2, 2);
      created
        .prepare(
          `INSERT INTO habits
             (id, name, group_id, priority, sort_order, archived_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run("floss", "Floss", "body", "low", 1, null, 1);
      created
        .prepare(
          `INSERT INTO habits
             (id, name, group_id, priority, sort_order, archived_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run("run", "Run", "body", "high", 2, null, 2);
      expect(created.pragma("user_version", { simple: true })).toBe(0);
      created.close();
      open = null;

      const first = openDatabase(file);
      open = first.$client;
      expect(habitOrders(first)).toEqual({ floss: 1, run: 0 });
      expect(groupOrders(first)).toEqual({ body: 0, mind: 1 });
      first.$client.close();
      open = null;

      const edited = new Database(file);
      open = edited;
      expect(edited.pragma("user_version", { simple: true })).toBe(3);
      edited.prepare("UPDATE habits SET sort_order = 5 WHERE id = 'run'").run();
      edited
        .prepare("UPDATE habits SET sort_order = 4 WHERE id = 'floss'")
        .run();
      edited.close();
      open = null;

      const second = openDatabase(file);
      open = second.$client;
      expect(habitOrders(second)).toEqual({ floss: 4, run: 5 });
      expect(groupOrders(second)).toEqual({ body: 0, mind: 1 });
    } finally {
      open?.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("applyArrangement", () => {
  it("keeps hidden habit slots and skips a write when the sequence matches", () => {
    const { dir, file } = tempFile();
    let open: Database.Database | null = null;
    try {
      const db = openDatabase(file);
      open = db.$client;
      db.insert(groups)
        .values({ id: "body", name: "Body", sortOrder: 0, createdAt: 1 })
        .run();
      db.insert(habits)
        .values([
          {
            id: "run",
            name: "Run",
            groupId: "body",
            priority: "high",
            sortOrder: 5,
            archivedAt: null,
            createdAt: 1,
          },
          {
            id: "floss",
            name: "Floss",
            groupId: "body",
            priority: "low",
            sortOrder: 6,
            archivedAt: 9,
            createdAt: 2,
          },
          {
            id: "read",
            name: "Read",
            groupId: "body",
            priority: "medium",
            sortOrder: 7,
            archivedAt: null,
            createdAt: 3,
          },
        ])
        .run();

      applyArrangement(db, {
        kind: "habits",
        groupId: "body",
        shown: "active",
        orderedIds: ["run", "read"],
      });
      expect(habitOrders(db)).toEqual({ run: 5, floss: 6, read: 7 });

      let rejection = "";
      try {
        applyArrangement(db, {
          kind: "habits",
          groupId: "body",
          shown: "active",
          orderedIds: ["run"],
        });
      } catch (error) {
        if (error instanceof OrderError) rejection = error.rejection;
      }
      expect(rejection).toBe("missing");
      expect(habitOrders(db)).toEqual({ run: 5, floss: 6, read: 7 });

      applyArrangement(db, {
        kind: "habits",
        groupId: "body",
        shown: "active",
        orderedIds: ["read", "run"],
      });
      expect(habitOrders(db)).toEqual({ read: 0, floss: 1, run: 2 });
    } finally {
      open?.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("renumbers every group only when the posted sequence changes", () => {
    const { dir, file } = tempFile();
    let open: Database.Database | null = null;
    try {
      const db = openDatabase(file);
      open = db.$client;
      db.insert(groups)
        .values([
          { id: "body", name: "Body", sortOrder: 4, createdAt: 1 },
          { id: "mind", name: "Mind", sortOrder: 8, createdAt: 2 },
        ])
        .run();

      applyArrangement(db, {
        kind: "groups",
        orderedIds: ["body", "mind"],
      });
      expect(groupOrders(db)).toEqual({ body: 4, mind: 8 });

      applyArrangement(db, {
        kind: "groups",
        orderedIds: ["mind", "body"],
      });
      expect(groupOrders(db)).toEqual({ mind: 0, body: 1 });
    } finally {
      open?.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
