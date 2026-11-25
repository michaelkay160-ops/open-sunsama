import type { TaskTag } from "@open-sunsama/types";
import { TagLabel } from "./task-tag-chips";

export function toggleSelection(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function TagOptions({
  tags,
  selected,
  onToggle,
  disabled,
  maxSelected,
}: {
  tags: TaskTag[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
  maxSelected?: number;
}) {
  return (
    <div className="max-h-48 overflow-y-auto">
      {tags.map((tag) => (
        <label
          key={tag.id}
          className="flex min-h-7 items-center gap-2 rounded px-1 text-sm hover:bg-accent"
        >
          <input
            type="checkbox"
            checked={selected.includes(tag.id)}
            disabled={
              disabled ||
              (maxSelected !== undefined &&
                selected.length >= maxSelected &&
                !selected.includes(tag.id))
            }
            onChange={() => onToggle(tag.id)}
          />
          <TagLabel tag={tag} />
        </label>
      ))}
    </div>
  );
}
