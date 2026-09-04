import { relations } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  groupId: text("group_id").references(() => groups.id, {
    onDelete: "set null",
  }),
  priority: text("priority").notNull().default("medium"),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: integer("archived_at"),
  createdAt: integer("created_at").notNull(),
});

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
  },
  (table) => [uniqueIndex("tags_name_unique").on(table.name)],
);

export const habitTags = sqliteTable(
  "habit_tags",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.habitId, table.tagId] })],
);

export const checkins = sqliteTable(
  "checkins",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
  },
  (table) => [primaryKey({ columns: [table.habitId, table.day] })],
);

export const groupsRelations = relations(groups, ({ many }) => ({
  habits: many(habits),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  group: one(groups, {
    fields: [habits.groupId],
    references: [groups.id],
  }),
  habitTags: many(habitTags),
  checkins: many(checkins),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  habitTags: many(habitTags),
}));

export const habitTagsRelations = relations(habitTags, ({ one }) => ({
  habit: one(habits, {
    fields: [habitTags.habitId],
    references: [habits.id],
  }),
  tag: one(tags, {
    fields: [habitTags.tagId],
    references: [tags.id],
  }),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  habit: one(habits, {
    fields: [checkins.habitId],
    references: [habits.id],
  }),
}));
