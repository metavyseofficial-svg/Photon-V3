import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/study/app-shell";
import { ProgressBar, ProgressRing } from "@/components/study/progress";
import { ResourceRow } from "@/components/study/resource-row";
import { useStudy } from "@/lib/study/store";
import { chapterQuestions, chapterStats } from "@/lib/study/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjects/$subjectId/$chapterId")({
  head: () => ({
    meta: [
      { title: "Chapter tracker — Photon" },
      {
        name: "description",
        content:
          "Track one chapter in detail — lectures, DPPs, PYQs, notes, revision and questions solved with live completion math.",
      },
      { property: "og:title", content: "Chapter tracker — Photon" },
      {
        property: "og:description",
        content: "Detailed resource-level progress for a single chapter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChapterDetail,
});

function ChapterDetail() {
  const { subjectId, chapterId } = Route.useParams();
  const {
    state,
    addResource,
    renameChapter,
    deleteChapter,
    toggleArchive,
    setCurrentChapter,
    toggleChapterDone,
  } = useStudy();
  const navigate = Route.useNavigate();

  const subject = state.subjects.find((s) => s.id === subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chapter?.name ?? "");
  const [newType, setNewType] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [newQuestions, setNewQuestions] = useState("");

  // Celebrate the moment a chapter flips to complete, not every render.
  const wasDone = useRef(Boolean(chapter?.done));
  const [doneBeat, setDoneBeat] = useState(0);
  useEffect(() => {
    const isDone = Boolean(chapter?.done);
    if (isDone && !wasDone.current) setDoneBeat((b) => b + 1);
    wasDone.current = isDone;
  }, [chapter?.done]);


  if (!subject || !chapter) {
    return (
      <AppShell>
        <Card>
          <p className="text-sm text-muted-foreground">
            This chapter no longer exists.{" "}
            <Link to="/subjects" className="font-semibold text-primary">
              Back to subjects
            </Link>
          </p>
        </Card>
      </AppShell>
    );
  }

  const st = chapterStats(chapter);
  const qs = chapterQuestions(chapter);
  const isCurrent = state.currentChapterId === chapter.id;

  return (
    <AppShell>
      <div className="animate-rise space-y-5">
        <Card className="lift-hover">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="min-w-0 flex-1">
              <Link
                to="/subjects/$subjectId"
                params={{ subjectId: subject.id }}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                ← {subject.name}
              </Link>
              {editing ? (
                <div className="mt-2 flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-surface/60 px-2.5 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Save name"
                    onClick={() => {
                      if (draft.trim()) renameChapter(subject.id, chapter.id, draft.trim());
                      setEditing(false);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel"
                    onClick={() => {
                      setDraft(chapter.name);
                      setEditing(false);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
                  {chapter.name}
                </h1>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {st.completed}/{st.total} items · {st.remaining} left
              </p>
              {qs.total > 0 ? (
                <p className="mt-1.5 text-sm font-semibold tabular-nums text-primary">
                  {qs.solved} of {qs.total} questions solved
                </p>
              ) : null}
              <ProgressBar
                className="mt-4"
                value={st.percent}
                tone={st.percent === 100 ? "success" : "primary"}
              />
            </div>
            <ProgressRing value={st.percent} size={116} sublabel="Chapter" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <button
              key={doneBeat}
              type="button"
              onClick={() => toggleChapterDone(subject.id, chapter.id)}
              className={cn(
                "press relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl border border-border px-3.5 py-2 text-xs font-semibold transition-all duration-300 hover:bg-secondary",
                chapter.done && "border-success/40 bg-success/15 text-success",
                chapter.done && doneBeat > 0 && "animate-lift-pop",
              )}
            >
              {chapter.done && doneBeat > 0 ? (
                <span
                  aria-hidden="true"
                  className="animate-burst pointer-events-none absolute inset-0 rounded-xl bg-success/25"
                />
              ) : null}
              <Check
                className={cn("h-4 w-4", chapter.done && doneBeat > 0 && "animate-check-pop")}
              />{" "}
              {chapter.done ? "Completed" : "Mark done"}
            </button>

            {!isCurrent ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentChapter(chapter.id);
                  toast.success(`${chapter.name} is now in focus`);
                }}
                className="press inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold hover:bg-secondary"
              >
                <Sparkles className="h-4 w-4" /> Set focus
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                In focus
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold hover:bg-secondary"
            >
              <Pencil className="h-4 w-4" /> Rename
            </button>
            <button
              type="button"
              onClick={() => toggleArchive(subject.id, chapter.id)}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold hover:bg-secondary"
            >
              {chapter.archived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {chapter.archived ? "Unarchive" : "Archive"}
            </button>
            <button
              type="button"
              onClick={() => {
                deleteChapter(subject.id, chapter.id);
                toast("Chapter deleted");
                void navigate({ to: "/subjects/$subjectId", params: { subjectId: subject.id } });
              }}
              className="press inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-secondary"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </Card>

        <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {chapter.resources.map((r) => (
            <ResourceRow key={r.id} subjectId={subject.id} chapterId={chapter.id} resource={r} />
          ))}
        </div>

        <Card>
          <p className="text-sm font-semibold">Add a resource</p>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const total = Number(newTotal);
              const questions = Number(newQuestions);
              if (!newType.trim() || !Number.isFinite(total) || total <= 0) return;
              addResource(
                subject.id,
                chapter.id,
                newType.trim(),
                Math.round(total),
                Number.isFinite(questions) && questions > 0 ? Math.round(questions) : undefined,
              );
              setNewType("");
              setNewTotal("");
              setNewQuestions("");
            }}
          >
            <input
              list="chapter-resource-presets"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Resource name (Lectures, DPP, custom…)"
              className="w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <datalist id="chapter-resource-presets">
              {state.resourcePresets.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newTotal}
                onChange={(e) => setNewTotal(e.target.value)}
                inputMode="numeric"
                placeholder="Total"
                className="min-w-0 rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <input
                value={newQuestions}
                onChange={(e) => setNewQuestions(e.target.value)}
                inputMode="numeric"
                placeholder="Questions (opt.)"
                className="min-w-0 rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <button
              type="submit"
              className="press inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add resource
            </button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
