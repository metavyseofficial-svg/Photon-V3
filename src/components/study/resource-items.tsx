import { useState } from "react";
import { Check, ChevronDown, ListChecks } from "lucide-react";
import { useStudy } from "@/lib/study/store";
import { resourceItems, resourceStats, type Resource } from "@/lib/study/types";
import { cn } from "@/lib/utils";

/**
 * Individual item tracking for a resource: every item (DPP 1, Lecture 2, ...)
 * can be completed on its own, with live completed/remaining counts.
 */
export function ResourceItems({
  subjectId,
  chapterId,
  resource,
}: {
  subjectId: string;
  chapterId: string;
  resource: Resource;
}) {
  const { toggleResourceItem, setResourceItemsDone } = useStudy();
  const stats = resourceStats(resource);
  const items = resourceItems(resource);
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const label = resource.name.trim() || "Item";

  return (
    <div className="mt-2.5 border-t border-border/60 pt-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <ListChecks className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Items
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-foreground">
          {stats.completed}/{stats.total}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          · {stats.remaining} left · {stats.percent}%
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="mt-2.5">
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.done}
                aria-label={`${label} ${item.position}${item.done ? " completed" : ""}`}
                onClick={() => toggleResourceItem(subjectId, chapterId, resource.id, item.id)}
                className={cn(
                  "grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-xs font-semibold tabular-nums transition-transform active:scale-90",
                  item.done
                    ? "border-transparent bg-brand text-primary-foreground"
                    : "border-border bg-background/50 text-muted-foreground hover:bg-secondary",
                )}
              >
                {item.done ? <Check className="h-3.5 w-3.5" /> : item.position}
              </button>
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setResourceItemsDone(subjectId, chapterId, resource.id, true)}
              className="rounded-full border border-border px-2.5 py-1 font-semibold transition-colors hover:bg-secondary"
            >
              Mark all done
            </button>
            <button
              type="button"
              onClick={() => setResourceItemsDone(subjectId, chapterId, resource.id, false)}
              className="rounded-full border border-border px-2.5 py-1 font-semibold text-muted-foreground transition-colors hover:bg-secondary"
            >
              Clear all
            </button>
            <span className="ml-auto text-muted-foreground">
              {stats.completed} completed · {stats.remaining} remaining
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
