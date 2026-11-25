import type { TaskTag } from "@open-sunsama/types";

export function TagLabel({ tag }: { tag: TaskTag }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="truncate" title={tag.name}>
        {tag.name}
      </span>
    </span>
  );
}

export function TaskTagChips({ tags }: { tags: TaskTag[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex max-w-full rounded bg-muted px-1.5 py-0.5 text-[11px] leading-4"
        >
          <TagLabel tag={tag} />
        </span>
      ))}
    </div>
  );
}
