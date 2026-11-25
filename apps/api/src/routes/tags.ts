import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  and,
  asc,
  eq,
  getDb,
  inArray,
  tags,
  tasks,
  taskTags,
} from "@open-sunsama/database";
import { ConflictError, NotFoundError, uuidSchema } from "@open-sunsama/utils";
import { publishEvent } from "../lib/websocket/index.js";
import { auth, requireScopes, type AuthVariables } from "../middleware/auth.js";
import {
  tagAssignmentSchema,
  tagSchema,
  updateTagSchema,
} from "../validation/tags.js";

const tagsRouter = new Hono<{ Variables: AuthVariables }>();
tagsRouter.use("*", auth);

const tagId = z.object({ id: uuidSchema });
const tagFields = { id: tags.id, name: tags.name, color: tags.color };

tagsRouter.get("/", requireScopes("tasks:read"), async (c) => {
  const data = await getDb()
    .select(tagFields)
    .from(tags)
    .where(eq(tags.userId, c.get("userId")))
    .orderBy(asc(tags.name), asc(tags.id));
  return c.json({ success: true, data });
});

tagsRouter.post(
  "/",
  requireScopes("tasks:write"),
  zValidator("json", tagSchema),
  async (c) => {
    const userId = c.get("userId");
    const [data] = await getDb()
      .insert(tags)
      .values({ userId, ...c.req.valid("json") })
      .onConflictDoNothing()
      .returning(tagFields);
    if (!data) throw new ConflictError("A tag with that name already exists");
    void publishEvent(userId, "tags:changed", { catalog: true });
    return c.json({ success: true, data }, 201);
  }
);

tagsRouter.patch(
  "/:id",
  requireScopes("tasks:write"),
  zValidator("param", tagId),
  zValidator("json", updateTagSchema),
  async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    try {
      const [data] = await getDb()
        .update(tags)
        .set(c.req.valid("json"))
        .where(and(eq(tags.userId, userId), eq(tags.id, id)))
        .returning(tagFields);
      if (!data) throw new NotFoundError("Tag", id);
      void publishEvent(userId, "tags:changed", { catalog: true });
      return c.json({ success: true, data });
    } catch (error) {
      // Drizzle wraps the PostgreSQL error in cause.
      const cause = error instanceof Error ? error.cause : undefined;
      if (
        cause &&
        typeof cause === "object" &&
        "code" in cause &&
        cause.code === "23505"
      ) {
        throw new ConflictError("A tag with that name already exists");
      }
      throw error;
    }
  }
);

tagsRouter.delete(
  "/:id",
  requireScopes("tasks:write"),
  zValidator("param", tagId),
  async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const [removed] = await getDb()
      .delete(tags)
      .where(and(eq(tags.userId, userId), eq(tags.id, id)))
      .returning({ id: tags.id });
    if (!removed) throw new NotFoundError("Tag", id);
    void publishEvent(userId, "tags:changed", { catalog: true });
    return c.json({ success: true, data: removed });
  }
);

tagsRouter.post(
  "/assign",
  requireScopes("tasks:write"),
  zValidator("json", tagAssignmentSchema),
  async (c) => {
    const userId = c.get("userId");
    const { taskIds, tagIds, operation } = c.req.valid("json");
    const changed = await getDb().transaction(async (tx) => {
      const ownedTags = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)))
        .orderBy(asc(tags.id))
        .for("share");
      if (ownedTags.length !== tagIds.length) throw new NotFoundError("Tag");

      // Lock tasks in a consistent order to serialize overlapping assignments.
      const ownedTasks = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
        .orderBy(asc(tasks.id))
        .for("no key update");
      if (ownedTasks.length !== taskIds.length) throw new NotFoundError("Task");

      if (operation === "add") {
        return tx
          .insert(taskTags)
          .values(
            taskIds.flatMap((taskId) =>
              tagIds.map((tagId) => ({ userId, taskId, tagId }))
            )
          )
          .onConflictDoNothing()
          .returning({ taskId: taskTags.taskId });
      }
      return tx
        .delete(taskTags)
        .where(
          and(
            eq(taskTags.userId, userId),
            inArray(taskTags.taskId, taskIds),
            inArray(taskTags.tagId, tagIds)
          )
        )
        .returning({ taskId: taskTags.taskId });
    });
    if (changed.length > 0)
      void publishEvent(userId, "tags:changed", { catalog: false });
    return c.json({ success: true, data: { changed: changed.length } });
  }
);

export { tagsRouter };
