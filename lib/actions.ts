"use server";

import { and, asc, eq, isNotNull, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  destroySession,
  loginWithPassword,
  requireUnlocked,
} from "./auth";
import { BackupError, importFile } from "./backup";
import { getDb } from "./db";
import { checkins, groups, habits } from "./db/schema";
import { findOrCreateGroup, pruneEmptyGroups } from "./groups";
import { parsePriority } from "./priority";
import { clearTheme, writeTheme } from "./settings";
import { parseTheme } from "./theme";
import { isValidDay, today } from "./timezone";

export type FormState = { error?: string; message?: string } | undefined;

const MAX_NAME = 100;
const MAX_GROUP = 60;

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function loginAction(
  _prev: { error?: string; username?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; username?: string }> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Enter your username and password.", username };
  }
  const { error } = await loginWithPassword(username, password);
  if (error) return { error, username };
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function saveThemeAction(formData: FormData) {
  await requireUnlocked();
  writeTheme(
    getDb(),
    parseTheme({
      mode: formData.get("mode"),
      background: formData.get("background"),
      accent: formData.get("accent"),
    }),
  );
  revalidateAll();
}

export async function resetThemeAction() {
  await requireUnlocked();
  clearTheme(getDb());
  revalidateAll();
}

/**
 * Mark a day done or not done. Idempotent, so retries and double taps are
 * safe. Returns an error instead of throwing, because production builds hide
 * thrown messages from the client.
 */
export async function setCheckin(
  habitId: string,
  day: string,
  done: boolean,
): Promise<{ error?: string }> {
  await requireUnlocked();
  if (!isValidDay(day)) {
    return { error: "That is not a valid date." };
  }
  if (day > today()) {
    return { error: "You can't check off a future day." };
  }
  const db = getDb();
  const habit = db
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.id, habitId))
    .get();
  if (!habit) {
    return { error: "This habit no longer exists." };
  }

  if (done) {
    db.insert(checkins).values({ habitId, day }).onConflictDoNothing().run();
  } else {
    db.delete(checkins)
      .where(and(eq(checkins.habitId, habitId), eq(checkins.day, day)))
      .run();
  }
  revalidateAll();
  return {};
}

type HabitFields = {
  name: string;
  groupName: string;
  priority: ReturnType<typeof parsePriority>;
};

function readHabitForm(formData: FormData): HabitFields | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const groupName = String(formData.get("group") ?? "").trim();
  if (!name) return { error: "Give the habit a name." };
  if (name.length > MAX_NAME) {
    return { error: `Keep the name under ${MAX_NAME} characters.` };
  }
  if (groupName.length > MAX_GROUP) {
    return { error: `Keep the group under ${MAX_GROUP} characters.` };
  }
  return { name, groupName, priority: parsePriority(formData.get("priority")) };
}

export async function createHabit(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUnlocked();
  const fields = readHabitForm(formData);
  if ("error" in fields) return fields;

  const db = getDb();
  const last =
    db.select({ value: max(habits.sortOrder) }).from(habits).get()?.value ?? 0;
  db.insert(habits)
    .values({
      id: crypto.randomUUID(),
      name: fields.name,
      groupId: findOrCreateGroup(db, fields.groupName),
      priority: fields.priority,
      sortOrder: last + 1,
      createdAt: Date.now(),
    })
    .run();

  revalidateAll();
  redirect("/");
}

export async function updateHabit(
  habitId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUnlocked();
  const fields = readHabitForm(formData);
  if ("error" in fields) return fields;

  const db = getDb();
  db.update(habits)
    .set({
      name: fields.name,
      groupId: findOrCreateGroup(db, fields.groupName),
      priority: fields.priority,
    })
    .where(eq(habits.id, habitId))
    .run();

  pruneEmptyGroups(db);
  revalidateAll();
  redirect(`/habits/${habitId}`);
}

export async function archiveHabit(habitId: string) {
  await requireUnlocked();
  getDb()
    .update(habits)
    .set({ archivedAt: Date.now() })
    .where(eq(habits.id, habitId))
    .run();
  revalidateAll();
  redirect("/");
}

export async function unarchiveHabit(habitId: string) {
  await requireUnlocked();
  getDb()
    .update(habits)
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
  pruneEmptyGroups(db);
  revalidateAll();
  redirect("/");
}

type Direction = "up" | "down";

/** Swap a habit with its neighbour among active habits in the same group. */
export async function moveHabit(habitId: string, direction: Direction) {
  await requireUnlocked();
  const db = getDb();
  const habit = db.select().from(habits).where(eq(habits.id, habitId)).get();
  if (!habit) return;
  db.transaction((tx) => {
    const siblings = tx
      .select({ id: habits.id })
      .from(habits)
      .where(
        and(
          habit.groupId
            ? eq(habits.groupId, habit.groupId)
            : isNull(habits.groupId),
          habit.archivedAt == null
            ? isNull(habits.archivedAt)
            : isNotNull(habits.archivedAt),
        ),
      )
      .orderBy(asc(habits.sortOrder), asc(habits.createdAt))
      .all()
      .map((row) => row.id);
    // Renumber the whole group so duplicate sort values can't block a move.
    reorder(siblings, habitId, direction).forEach((id, index) => {
      tx.update(habits)
        .set({ sortOrder: index + 1 })
        .where(eq(habits.id, id))
        .run();
    });
  });
  revalidateAll();
}

export async function moveGroup(groupId: string, direction: Direction) {
  await requireUnlocked();
  const db = getDb();
  db.transaction((tx) => {
    const ids = tx
      .select({ id: groups.id })
      .from(groups)
      .orderBy(asc(groups.sortOrder), asc(groups.name))
      .all()
      .map((row) => row.id);
    reorder(ids, groupId, direction).forEach((id, index) => {
      tx.update(groups)
        .set({ sortOrder: index + 1 })
        .where(eq(groups.id, id))
        .run();
    });
  });
  revalidateAll();
}

function reorder(ids: string[], id: string, direction: Direction): string[] {
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export async function importBackupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUnlocked();
  const file = formData.get("backup");
  if (!file || typeof file === "string" || file.size === 0) {
    return { error: "Choose a backup file." };
  }
  let message: string;
  try {
    const result = importFile(getDb(), await file.text(), today());
    message =
      result.format === "beaver"
        ? `Imported from Beaver Habits: ${plural(result.added, "habit")} added, ${plural(result.merged, "habit")} merged.`
        : `Imported ${plural(result.habits, "habit")}. Existing data was replaced.`;
  } catch (error) {
    if (error instanceof BackupError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidateAll();
  return { message };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
