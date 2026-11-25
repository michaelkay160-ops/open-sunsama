import type { TagInput, TaskTag, TaskTagAssignment } from "@open-sunsama/types";
import type { OpenSunsamaClient, RequestOptions } from "./client.js";

export function createTagsApi(client: OpenSunsamaClient) {
  return {
    async list(options?: RequestOptions) {
      return (await client.get<{ data: TaskTag[] }>("tags", options)).data;
    },
    async create(input: TagInput) {
      return (await client.post<{ data: TaskTag }>("tags", input)).data;
    },
    async update(id: string, input: Partial<TagInput>) {
      return (await client.patch<{ data: TaskTag }>(`tags/${id}`, input)).data;
    },
    async delete(id: string) {
      await client.delete(`tags/${id}`);
    },
    async assign(input: TaskTagAssignment) {
      return (
        await client.post<{ data: { changed: number } }>("tags/assign", input)
      ).data;
    },
  };
}
