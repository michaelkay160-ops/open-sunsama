import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from "@/components/ui";
import { useAssignTaskTags, useTags } from "@/hooks/useTags";
import { toast } from "@/hooks/use-toast";
import { getApi } from "@/lib/api";
import { taskKeys } from "@/lib/query-keys";
import { TagOptions, toggleSelection } from "./tag-options";
import { TaskTagChips } from "./task-tag-chips";

export function BulkTagDialog({
  backlog,
  filterIds,
  onClose,
}: {
  backlog: boolean;
  filterIds: string[];
  onClose: () => void;
}) {
  const catalog = useTags();
  const assign = useAssignTaskTags();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const filters = {
    backlog,
    titleSearch: search.trim() || undefined,
    scheduledDate: date || undefined,
    tagIds: filterIds,
    limit: 25,
    page,
  };
  const tasks = useQuery({
    queryKey: [...taskKeys.tagViews(), "bulk", filters],
    queryFn: ({ signal }) => getApi().tasks.list(filters, { signal }),
  });
  const selectedTags = tagIds.filter((id) =>
    catalog.data?.some((tag) => tag.id === id)
  );

  function apply(operation: "add" | "remove") {
    assign.mutate(
      { taskIds, tagIds: selectedTags, operation },
      {
        onSuccess: ({ changed }) => {
          toast({
            title:
              changed === 0
                ? "Tags already up to date"
                : operation === "add"
                  ? "Tags added"
                  : "Tags removed",
          });
          onClose();
        },
      }
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogTitle>
          Bulk tag {backlog ? "backlog" : "scheduled"} tasks
        </DialogTitle>
        <DialogDescription>
          Select tasks and tags, then add or remove the tags in one step.
        </DialogDescription>
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label="Find tasks to tag"
            placeholder="Find tasks…"
            value={search}
            maxLength={200}
            className="min-w-32 flex-1"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {!backlog && (
            <Input
              type="date"
              aria-label="Scheduled date"
              value={date}
              className="w-auto"
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          )}
        </div>
        <div className="max-h-48 min-h-12 overflow-y-auto rounded border border-border p-1">
          {tasks.isPending && (
            <p className="p-1 text-xs text-muted-foreground">Loading tasks…</p>
          )}
          {tasks.isError && (
            <p role="alert" className="p-1 text-xs text-destructive">
              Could not load tasks.
            </p>
          )}
          {tasks.data?.data.length === 0 && (
            <p className="p-1 text-xs text-muted-foreground">
              No matching tasks.
            </p>
          )}
          {tasks.data?.data.map((task) => (
            <label
              key={task.id}
              className="flex items-start gap-2 rounded p-1 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={taskIds.includes(task.id)}
                disabled={
                  assign.isPending ||
                  (taskIds.length >= 200 && !taskIds.includes(task.id))
                }
                onChange={() =>
                  setTaskIds((ids) => toggleSelection(ids, task.id))
                }
              />
              <span className="min-w-0">
                <span className="block break-words">{task.title}</span>
                {!backlog && (
                  <span className="block text-xs text-muted-foreground">
                    {task.scheduledDate}
                  </span>
                )}
                {!!task.tags?.length && <TaskTagChips tags={task.tags} />}
              </span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{taskIds.length} of 200 selected</span>
          <div className="flex gap-1">
            {!!taskIds.length && (
              <Button size="sm" variant="ghost" onClick={() => setTaskIds([])}>
                Clear selection
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= (tasks.data?.meta.totalPages ?? page)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
        <fieldset className="min-w-0 rounded border border-border p-1.5">
          <legend className="px-1 text-xs font-medium">Tags</legend>
          {catalog.isPending && (
            <p className="text-xs text-muted-foreground">Loading tags…</p>
          )}
          {catalog.isError && (
            <p role="alert" className="text-xs text-destructive">
              Could not load tags.
            </p>
          )}
          {catalog.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Create a tag in Manage tags first.
            </p>
          )}
          <TagOptions
            tags={catalog.data ?? []}
            selected={selectedTags}
            disabled={assign.isPending}
            maxSelected={50}
            onToggle={(id) => setTagIds((ids) => toggleSelection(ids, id))}
          />
        </fieldset>
        {assign.isError && (
          <p role="alert" className="text-sm text-destructive">
            {assign.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={
              assign.isPending || !taskIds.length || !selectedTags.length
            }
            onClick={() => apply("remove")}
          >
            Remove tags
          </Button>
          <Button
            size="sm"
            disabled={
              assign.isPending || !taskIds.length || !selectedTags.length
            }
            onClick={() => apply("add")}
          >
            Add tags
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
