import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { users } from "./users";

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    color: varchar("color", { length: 7 }).notNull(),
  },
  (table) => [
    uniqueIndex("tags_user_id_id_idx").on(table.userId, table.id),
    uniqueIndex("tags_user_name_idx").on(
      table.userId,
      sql`lower(${table.name})`
    ),
    check(
      "tags_name_check",
      sql`length(btrim(${table.name})) > 0 AND ${table.name} = btrim(${table.name})`
    ),
    check("tags_color_check", sql`${table.color} ~ '^#[0-9A-Fa-f]{6}$'`),
  ]
);

export const taskTags = pgTable(
  "task_tags",
  {
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id").notNull(),
    tagId: uuid("tag_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.taskId, table.tagId] }),
    index("task_tags_user_tag_idx").on(table.userId, table.tagId, table.taskId),
    foreignKey({
      columns: [table.userId, table.taskId],
      foreignColumns: [tasks.userId, tasks.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId, table.tagId],
      foreignColumns: [tags.userId, tags.id],
    }).onDelete("cascade"),
  ]
);
