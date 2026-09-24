import { max, sql } from "drizzle-orm";
import type { DbOrTx } from "./db";
import { groups } from "./db/schema";

/** Group id for a name, matched case-insensitively. Empty name means no group. */
export function findOrCreateGroup(db: DbOrTx, name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = db
    .select({ id: groups.id })
    .from(groups)
    .where(sql`lower(${groups.name}) = ${trimmed.toLowerCase()}`)
    .get();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  const last =
    db.select({ value: max(groups.sortOrder) }).from(groups).get()?.value ?? 0;
  db.insert(groups)
    .values({ id, name: trimmed, sortOrder: last + 1, createdAt: Date.now() })
    .run();
  return id;
}

export function pruneEmptyGroups(db: DbOrTx) {
  db.run(
    sql`DELETE FROM groups WHERE id NOT IN (SELECT group_id FROM habits WHERE group_id IS NOT NULL)`,
  );
}
