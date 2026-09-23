"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroySession,
  requireUnlocked,
  unlockWithKey,
} from "./auth";
import { applyArrangement } from "./arrange";
import { BackupError, importSnapshot } from "./backup";
import { getDb } from "./db";
import { checkins, groups, habits } from "./db/schema";
import { nextSortOrder, OrderError, parseArrangement } from "./order";
import { parsePriority } from "./priority";


function newId() {
  return crypto.randomUUID();
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function unlockAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const key = String(formData.get("key") ?? "");
  if (!key) return { error: "Enter your key." };
  const ok = await unlockWithKey(key);
  if (!ok) return { error: "Wrong key." };
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/unlock");
}

export async function toggleCheckin(habitId: string, day: string) {
  await requireUnlocked();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error("Invalid day");
  }
  const db = getDb();
  const existing = db
    .select()
    .from(checkins)
    .where(and(eq(checkins.habitId, habitId), eq(checkins.day, day)))
    .get();

  if (existing) {
    db.delete(checkins)
      .where(and(eq(checkins.habitId, habitId), eq(checkins.day, day)))
      .run();
  } else {
    db.insert(checkins).values({ habitId, day }).run();
  }

  revalidateAll();
}

export async function commitArrangement(input: unknown): Promise<void> {
  await requireUnlocked();
  const arrangement = parseArrangement(input);
  if (!arrangement) throw new OrderError("malformed");
  applyArrangement(getDb(), arrangement);
  revalidateAll();
}

export async function createHabit(formData: FormData) {
  await requireUnlocked();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }
  const groupName = String(formData.get("group") ?? "").trim();
  const priority = parsePriority(formData.get("priority"));

  const db = getDb();
  const id = newId();
  const groupId = getOrCreateGroup(groupName);

  db.insert(habits)
    .values({
      id,
      name,
      groupId,
      priority,
      sortOrder: nextHabitSortOrder(groupId),
      createdAt: Date.now(),
    })
    .run();

  pruneUnused();
  revalidateAll();
  redirect("/");
}

export async function updateHabit(habitId: string, formData: FormData) {
  await requireUnlocked();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }
  const groupName = String(formData.get("group") ?? "").trim();
  const priority = parsePriority(formData.get("priority"));
  const db = getDb();
  const current = db
    .select({ groupId: habits.groupId })
    .from(habits)
    .where(eq(habits.id, habitId))
    .get();
  const groupId = getOrCreateGroup(groupName);

  db.update(habits)
    .set({
      name,
      groupId,
      priority,
      ...(current && current.groupId !== groupId
        ? { sortOrder: nextHabitSortOrder(groupId) }
        : {}),
    })
    .where(eq(habits.id, habitId))
    .run();

  pruneUnused();
  revalidateAll();
  redirect(`/habits/${habitId}`);
}

export async function archiveHabit(habitId: string) {
  await requireUnlocked();
  const db = getDb();
  db.update(habits)
    .set({ archivedAt: Date.now() })
    .where(eq(habits.id, habitId))
    .run();
  revalidateAll();
  redirect("/");
}

export async function unarchiveHabit(habitId: string) {
  await requireUnlocked();
  const db = getDb();
  db.update(habits)
    .set({ archivedAt: null })
    .where(eq(habits.id, habitId))
    .run();
  revalidateAll();
  redirect(`/habits/${habitId}`);
}

export async function deleteHabit(habitId: string) {
  await requireUnlocked();
  const db = getDb();
  db.delete(habits).where(eq(habits.id, habitId)).run();
  pruneUnused();
  revalidateAll();
  redirect("/");
}

export async function importBackupAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  await requireUnlocked();
  const file = formData.get("backup");
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "Choose a backup file." };
  }
  const text = await file.text();
  try {
    importSnapshot(getDb(), text);
  } catch (error) {
    if (error instanceof BackupError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidateAll();
  redirect("/settings?imported=1");
}

function getOrCreateGroup(name: string): string | null {
  if (!name) return null;
  const db = getDb();
  const existing = db
    .select()
    .from(groups)
    .where(sql`lower(${groups.name}) = ${name.toLowerCase()}`)
    .get();
  if (existing) return existing.id;
  const id = newId();
  db.insert(groups)
    .values({
      id,
      name,
      sortOrder: nextGroupSortOrder(),
      createdAt: Date.now(),
    })
    .run();
  return id;
}

function nextHabitSortOrder(groupId: string | null): number {
  const db = getDb();
  const rows = db
    .select({ sortOrder: habits.sortOrder })
    .from(habits)
    .where(
      groupId === null ? isNull(habits.groupId) : eq(habits.groupId, groupId),
    )
    .all();
  return nextSortOrder(rows.map((row) => row.sortOrder));
}

function nextGroupSortOrder(): number {
  const db = getDb();
  const rows = db.select({ sortOrder: groups.sortOrder }).from(groups).all();
  return nextSortOrder(rows.map((row) => row.sortOrder));
}

function pruneUnused() {
  const db = getDb();
  db.run(
    sql`DELETE FROM groups WHERE id NOT IN (SELECT group_id FROM habits WHERE group_id IS NOT NULL)`,
  );
}
