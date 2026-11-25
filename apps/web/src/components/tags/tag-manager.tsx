import { useState } from "react";
import type { TaskTag } from "@open-sunsama/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
} from "@/components/ui";
import { useManageTags, useTags } from "@/hooks/useTags";
import { TagLabel } from "./task-tag-chips";

const newTagColor = "#2563eb";

export function TagManager({ onClose }: { onClose: () => void }) {
  const catalog = useTags();
  const { save, remove } = useManageTags();
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [color, setColor] = useState(newTagColor);
  const [confirmDelete, setConfirmDelete] = useState<TaskTag>();
  const busy = save.isPending || remove.isPending;

  function edit(tag?: TaskTag) {
    save.reset();
    remove.reset();
    setConfirmDelete(undefined);
    setEditingId(tag?.id);
    setName(tag?.name ?? "");
    setColor(tag?.color.toLowerCase() ?? newTagColor);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
        <DialogTitle>Manage tags</DialogTitle>
        <DialogDescription>
          Use the same tags across your tasks.
        </DialogDescription>
        {catalog.isPending && (
          <p className="text-xs text-muted-foreground">Loading tags…</p>
        )}
        {catalog.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load tags.
          </p>
        )}
        {!!catalog.data?.length && (
          <ul className="max-h-52 overflow-y-auto">
            {catalog.data.map((tag) => (
              <li
                key={tag.id}
                className="flex min-h-8 items-center justify-between gap-2 text-sm"
              >
                <TagLabel tag={tag} />
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Edit ${tag.name}`}
                    onClick={() => edit(tag)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Delete ${tag.name}`}
                    onClick={() => {
                      remove.reset();
                      setConfirmDelete(tag);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {confirmDelete && (
          <div className="space-y-2 rounded border border-border p-2 text-sm">
            <p>
              Remove {confirmDelete.name} from all tasks and delete the tag?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmDelete(undefined)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() =>
                  remove.mutate(confirmDelete.id, {
                    onSuccess: () => {
                      if (editingId === confirmDelete.id) edit();
                      else setConfirmDelete(undefined);
                    },
                  })
                }
              >
                Delete tag
              </Button>
            </div>
          </div>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim())
              save.mutate(
                { id: editingId, input: { name, color } },
                { onSuccess: () => edit() }
              );
          }}
        >
          <label className="min-w-24 flex-1 space-y-1 text-xs">
            Tag name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              disabled={busy}
              required
            />
          </label>
          <label className="space-y-1 text-xs">
            Color
            <input
              type="color"
              className="block h-9 w-10 cursor-pointer rounded border border-border bg-background"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={busy}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            className="h-9"
            disabled={busy || !name.trim()}
          >
            {editingId ? "Save" : "Create tag"}
          </Button>
          {editingId && (
            <Button
              type="button"
              size="sm"
              className="h-9"
              variant="ghost"
              disabled={busy}
              onClick={() => edit()}
            >
              Cancel edit
            </Button>
          )}
        </form>
        {(save.isError || remove.isError) && (
          <p role="alert" className="text-sm text-destructive">
            {(save.error ?? remove.error)?.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
