import { eq } from "drizzle-orm";
import type { DatabaseClient } from "./db";
import { settings } from "./db/schema";
import { DEFAULT_THEME, parseTheme, type Theme } from "./theme";

const THEME_KEY = "theme";

export function readTheme(db: DatabaseClient): Theme {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, THEME_KEY))
    .get();
  return row ? parseTheme(row.value) : { ...DEFAULT_THEME };
}

export function writeTheme(db: DatabaseClient, theme: Theme) {
  const value = JSON.stringify(parseTheme(theme));
  db.insert(settings)
    .values({ key: THEME_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function clearTheme(db: DatabaseClient) {
  db.delete(settings).where(eq(settings.key, THEME_KEY)).run();
}
