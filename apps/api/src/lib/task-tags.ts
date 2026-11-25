import {
  and,
  asc,
  eq,
  inArray,
  tags,
  taskTags,
  type DbClient,
} from "@open-sunsama/database";

export async function withTaskTags<T extends { id: string }>(
  db: Pick<DbClient, "select">,
  userId: string,
  tasks: T[]
) {
  if (tasks.length === 0) return [];

  const rows = await db
    .select({
      taskId: taskTags.taskId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(taskTags)
    .innerJoin(
      tags,
      and(eq(tags.userId, taskTags.userId), eq(tags.id, taskTags.tagId))
    )
    .where(
      and(
        eq(taskTags.userId, userId),
        inArray(
          taskTags.taskId,
          tasks.map((task) => task.id)
        )
      )
    )
    .orderBy(asc(tags.name), asc(tags.id));

  const byTaskId = new Map<
    string,
    Array<Omit<(typeof rows)[number], "taskId">>
  >();
  for (const { taskId, ...tag } of rows) {
    const list = byTaskId.get(taskId);
    if (list) list.push(tag);
    else byTaskId.set(taskId, [tag]);
  }
  return tasks.map((task) => ({ ...task, tags: byTaskId.get(task.id) ?? [] }));
}
