import { useEffect, useState } from "react";
import { Tags } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { useTags } from "@/hooks/useTags";
import { BulkTagDialog } from "./bulk-tag-dialog";
import { TagManager } from "./tag-manager";
import { TagOptions, toggleSelection } from "./tag-options";

export function TagToolbar({
  backlog = false,
  selected,
  onChange,
}: {
  backlog?: boolean;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const catalog = useTags();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"manage" | "bulk">();

  useEffect(() => {
    const tags = catalog.data;
    if (!tags || !selected.length) return;
    const remaining = selected.filter((id) =>
      tags.some((tag) => tag.id === id)
    );
    if (remaining.length !== selected.length) onChange(remaining);
  }, [catalog.data, selected, onChange]);

  function openDialog(kind: "manage" | "bulk") {
    setOpen(false);
    setDialog(kind);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={selected.length ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1 px-2"
            aria-label={`Tags for ${backlog ? "backlog" : "board"}${selected.length ? `, ${selected.length} filters` : ""}`}
          >
            <Tags className="size-3.5" aria-hidden />
            {selected.length || (
              <span className={backlog ? "sr-only" : "hidden sm:inline"}>
                Tags
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 space-y-2 p-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium">
              Filter by all selected tags
            </span>
            {!!selected.length && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1"
                onClick={() => onChange([])}
              >
                Clear
              </Button>
            )}
          </div>
          {catalog.isPending && (
            <p className="text-xs text-muted-foreground">Loading tags…</p>
          )}
          {catalog.isError && (
            <p role="alert" className="text-xs text-destructive">
              Could not load tags.
            </p>
          )}
          {catalog.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">No tags yet.</p>
          )}
          <TagOptions
            tags={catalog.data ?? []}
            selected={selected}
            maxSelected={50}
            onToggle={(id) => onChange(toggleSelection(selected, id))}
          />
          <div className="flex justify-between border-t border-border pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDialog("manage")}
            >
              Manage tags
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDialog("bulk")}
            >
              Bulk tag
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {dialog === "manage" && (
        <TagManager onClose={() => setDialog(undefined)} />
      )}
      {dialog === "bulk" && (
        <BulkTagDialog
          backlog={backlog}
          filterIds={selected}
          onClose={() => setDialog(undefined)}
        />
      )}
    </>
  );
}
