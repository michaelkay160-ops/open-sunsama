import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TagInput,
  TaskFilterInput,
  TaskTagAssignment,
} from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { tagKeys, taskKeys } from "@/lib/query-keys";
import { useTasks } from "./useTasks";

export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: ({ signal }) => getApi().tags.list({ signal }),
  });
}

export function useTasksWithTagFilter(
  filters: TaskFilterInput,
  tagIds: string[]
) {
  const unfiltered = useTasks(filters);
  const filtered = useQuery({
    // A separate key keeps the reorder code's optimistic writes limited to
    // complete date/backlog buckets.
    queryKey: [...taskKeys.tagViews(), "filter", filters, tagIds],
    queryFn: async ({ signal }) =>
      (await getApi().tasks.list({ ...filters, tagIds }, { signal })).data,
    enabled: tagIds.length > 0,
  });
  return tagIds.length ? filtered : unfiltered;
}

export function useManageTags() {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TagInput }) =>
      id ? getApi().tags.update(id, input) : getApi().tags.create(input),
    onSuccess: (_tag, { id }) => {
      if (id) void client.invalidateQueries({ queryKey: taskKeys.all });
      return client.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => getApi().tags.delete(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: taskKeys.all });
      return client.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
  return { save, remove };
}

export function useAssignTaskTags() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskTagAssignment) => getApi().tags.assign(input),
    onSuccess: () => client.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
