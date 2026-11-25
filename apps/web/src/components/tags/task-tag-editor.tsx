import { Tags } from "lucide-react";
import type { Task } from "@open-sunsama/types";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { useAssignTaskTags, useTags } from "@/hooks/useTags";
import { TagOptions } from "./tag-options";
import { TaskTagChips } from "./task-tag-chips";

export function TaskTagEditor({ task }: { task: Task }) {
  const catalog = useTags();
  const assign = useAssignTaskTags();
  const selected = task.tags?.map((tag) => tag.id) ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5"
          >
            <Tags className="size-3.5" aria-hidden /> Edit tags
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 space-y-2 p-2">
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
              Create a tag from the board or backlog.
            </p>
          )}
          <TagOptions
            tags={catalog.data ?? []}
            selected={selected}
            disabled={assign.isPending}
            onToggle={(id) =>
              assign.mutate({
                taskIds: [task.id],
                tagIds: [id],
                operation: selected.includes(id) ? "remove" : "add",
              })
            }
          />
          {assign.isError && (
            <p role="alert" className="text-xs text-destructive">
              {assign.error.message}
            </p>
          )}
        </PopoverContent>
      </Popover>
      {!!task.tags?.length && <TaskTagChips tags={task.tags} />}
    </div>
  );
}
