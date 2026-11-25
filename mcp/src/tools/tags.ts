import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { ApiClient, ApiResponse } from "../lib/api-client.js";
import { defineTool } from "../lib/define-tool.js";

function result<T>(response: ApiResponse<T>) {
  const text = response.success
    ? JSON.stringify(response.data)
    : (response.error?.message ?? "Tag request failed");
  return {
    content: [{ type: "text" as const, text }],
    isError: !response.success,
  };
}

export function registerTagTools(server: McpServer, api: ApiClient) {
  const name = z.string().trim().min(1).max(60);
  const color = z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .describe("Six-digit hex color, such as #2563EB.");

  defineTool(
    server,
    "list_tags",
    "List the account's task tags with their IDs and colors.",
    {},
    async () => result(await api.listTags())
  );
  defineTool(
    server,
    "create_tag",
    "Create a reusable colored task tag.",
    { name, color },
    async (input) => result(await api.createTag(input))
  );
  defineTool(
    server,
    "update_tag",
    "Rename or recolor an existing task tag.",
    {
      id: z.uuid(),
      name: name.optional(),
      color: color.optional(),
    },
    async ({ id, ...input }) => result(await api.updateTag(id, input))
  );
  defineTool(
    server,
    "delete_tag",
    "Delete a tag and remove it from every task. Tasks are preserved.",
    {
      id: z.uuid(),
    },
    async ({ id }) => result(await api.deleteTag(id))
  );
  defineTool(
    server,
    "assign_task_tags",
    "Add or remove one or more tags on up to 200 tasks in one atomic operation. Adding an existing assignment or removing a missing assignment is safe.",
    {
      taskIds: z.array(z.uuid()).min(1).max(200),
      tagIds: z.array(z.uuid()).min(1).max(50),
      operation: z.enum(["add", "remove"]),
    },
    async (input) => result(await api.assignTaskTags(input))
  );
}
