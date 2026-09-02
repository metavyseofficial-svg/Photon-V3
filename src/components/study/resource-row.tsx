import { GripVertical, Minus, Plus, Trash2 } from "lucide-react";
import { ProgressBar } from "@/components/study/progress";
import { ResourceItems } from "@/components/study/resource-items";
import { useStudy } from "@/lib/study/store";
import { resourceStats, type Resource } from "@/lib/study/types";

export function ResourceRow({
  subjectId,
  chapterId,
  resource,
}: {
  subjectId: string;
  chapterId: string;
  resource: Resource;
}) {
  const { updateResource, deleteResource, bumpProgress, reorderResource } = useStudy();
  const stats = resourceStats(resource);
  const pct = stats.percent;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData("text/resource", resource.id);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.stopPropagation();
        const from = e.dataTransfer.getData("text/resource");
        if (from) reorderResource(subjectId, chapterId, from, resource.id);
      }}
      className="animate-pop glass-inset rounded-2xl p-3 lift hover:shadow-[var(--shadow-soft)]"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
        <input
          value={resource.name}
          onChange={(e) =>
            updateResource(subjectId, chapterId, resource.id, { name: e.target.value })
          }
          className="min-w-0 truncate bg-transparent text-sm font-semibold outline-none"
        />
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {pct}%
        </span>
        <button
          type="button"
          aria-label="Delete resource"
          onClick={() => deleteResource(subjectId, chapterId, resource.id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-secondary"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>

      <ProgressBar className="mt-2.5 h-1.5" value={pct} tone={pct === 100 ? "success" : "primary"} />

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Decrease completed"
          onClick={() => bumpProgress(subjectId, chapterId, resource.id, -1)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border transition-transform hover:bg-secondary active:scale-90"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          value={resource.completed}
          onChange={(e) =>
            updateResource(subjectId, chapterId, resource.id, {
              completed: Number(e.target.value) || 0,
            })
          }
          inputMode="numeric"
          aria-label="Completed"
          className="w-11 min-w-0 rounded-lg border border-border bg-background/50 px-1.5 py-1 text-center text-sm tabular-nums outline-none"
        />
        <span className="text-xs text-muted-foreground">/</span>
        <input
          value={resource.total}
          onChange={(e) =>
            updateResource(subjectId, chapterId, resource.id, { total: Number(e.target.value) || 0 })
          }
          inputMode="numeric"
          aria-label="Total"
          className="w-11 min-w-0 rounded-lg border border-border bg-background/50 px-1.5 py-1 text-center text-sm tabular-nums outline-none"
        />
        <button
          type="button"
          aria-label="Increase completed"
          onClick={() => bumpProgress(subjectId, chapterId, resource.id, 1)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground transition-transform hover:opacity-90 active:scale-90"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {stats.remaining} left
        </span>
      </div>

      <ResourceItems subjectId={subjectId} chapterId={chapterId} resource={resource} />


      <div className="mt-2.5 flex items-center gap-1.5 border-t border-border/60 pt-2.5">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Qs
        </span>
        <input
          value={resource.questionsDone ?? ""}
          onChange={(e) =>
            updateResource(subjectId, chapterId, resource.id, {
              questions: resource.questions ?? 0,
              questionsDone: Number(e.target.value) || 0,
            })
          }
          inputMode="numeric"
          placeholder="0"
          aria-label="Questions solved"
          className="w-11 min-w-0 rounded-lg border border-border bg-background/50 px-1.5 py-1 text-center text-sm tabular-nums outline-none"
        />
        <span className="text-xs text-muted-foreground">/</span>
        <input
          value={resource.questions ?? ""}
          onChange={(e) =>
            updateResource(subjectId, chapterId, resource.id, {
              questions: Number(e.target.value) || 0,
            })
          }
          inputMode="numeric"
          placeholder="—"
          aria-label="Total questions"
          className="w-11 min-w-0 rounded-lg border border-border bg-background/50 px-1.5 py-1 text-center text-sm tabular-nums outline-none"
        />
        {resource.questions ? (
          <span className="ml-auto text-[11px] font-semibold tabular-nums text-primary">
            {Math.round(((resource.questionsDone ?? 0) / resource.questions) * 100)}% solved
          </span>
        ) : null}
      </div>
    </div>
  );
}
