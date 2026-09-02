import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Layers, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/study/app-shell";
import { ProgressBar, ProgressRing } from "@/components/study/progress";
import { useStudy } from "@/lib/study/store";
import {
  chapterPercent,
  chapterQuestions,
  isChapterComplete,
  subjectQuestions,
  subjectStats,
  subjectSyllabusStats,
} from "@/lib/study/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjects/$subjectId/")({
  head: () => ({
    meta: [
      { title: "Chapters — Photon" },
      {
        name: "description",
        content:
          "A compact chapter list for every subject with live completion, common resources and one tap into detailed tracking.",
      },
      { property: "og:title", content: "Chapters — Photon" },
      {
        property: "og:description",
        content: "Tap a chapter to track lectures, DPPs, PYQs, notes and revision.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubjectDetail,
});

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const { state, addChapter, addCommonResource, deleteCommonResource, applyCommonResources } =
    useStudy();
  const subject = state.subjects.find((s) => s.id === subjectId);
  const [name, setName] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [openCommon, setOpenCommon] = useState(false);
  const [cName, setCName] = useState("");
  const [cTotal, setCTotal] = useState("");
  const [cQuestions, setCQuestions] = useState("");

  if (!subject) {
    return (
      <AppShell>
        <Card>
          <p className="text-sm text-muted-foreground">
            This subject no longer exists.{" "}
            <Link to="/subjects" className="font-semibold text-primary">
              Back to subjects
            </Link>
          </p>
        </Card>
      </AppShell>
    );
  }

  const st = subjectStats(subject);
  const syl = subjectSyllabusStats(subject);
  const qs = subjectQuestions(subject);
  const common = subject.commonResources ?? [];
  const chapters = subject.chapters.filter(
    (c) => c.archived === showArchived && c.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell>
      <div className="animate-rise space-y-5">
        <Card className="lift-hover">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
            <div className="min-w-0 flex-1">
              <Link
                to="/subjects"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                ← Subjects
              </Link>
              <h1 className="mt-2 truncate font-display text-2xl font-semibold sm:text-3xl">
                {subject.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {syl.completed}/{syl.total} chapters done · {st.completed}/{st.total} items
              </p>
              {qs.total > 0 ? (
                <p className="mt-1.5 text-sm font-semibold tabular-nums text-primary">
                  {qs.solved} of {qs.total} questions solved
                </p>
              ) : null}
              <ProgressBar className="mt-4" value={st.percent} />
            </div>
            <ProgressRing value={st.percent} size={116} sublabel="Subject" />
          </div>
        </Card>

        <Card className="space-y-3">
          <button
            type="button"
            onClick={() => setOpenCommon((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <Layers className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Common resources</span>
              <span className="block text-xs text-muted-foreground">
                {common.length === 0
                  ? "Define once — added to every chapter"
                  : common.map((c) => c.name).join(" · ")}
              </span>
            </span>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0 transition-transform", openCommon && "rotate-90")}
            />
          </button>

          {openCommon ? (
            <div className="space-y-3 border-t border-border/60 pt-3">
              {common.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {common.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/60 px-3 py-1.5 text-xs font-semibold"
                    >
                      {t.name} · {t.total}
                      {t.questions ? ` · ${t.questions}Q` : ""}
                      <button
                        type="button"
                        aria-label={`Remove ${t.name}`}
                        onClick={() => deleteCommonResource(subject.id, t.id)}
                        className="grid h-5 w-5 place-items-center rounded-full hover:bg-secondary"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const total = Number(cTotal);
                  const questions = Number(cQuestions);
                  if (!cName.trim() || !Number.isFinite(total) || total <= 0) return;
                  addCommonResource(
                    subject.id,
                    cName.trim(),
                    Math.round(total),
                    Number.isFinite(questions) && questions > 0 ? Math.round(questions) : undefined,
                  );
                  toast.success(`${cName.trim()} added to every chapter`);
                  setCName("");
                  setCTotal("");
                  setCQuestions("");
                }}
              >
                <input
                  list="resource-presets"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="Resource name (Lectures, DPP, custom…)"
                  className="w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
                <datalist id="resource-presets">
                  {state.resourcePresets.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={cTotal}
                    onChange={(e) => setCTotal(e.target.value)}
                    inputMode="numeric"
                    placeholder="Total"
                    className="min-w-0 rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <input
                    value={cQuestions}
                    onChange={(e) => setCQuestions(e.target.value)}
                    inputMode="numeric"
                    placeholder="Questions (opt.)"
                    className="min-w-0 rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="press inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Add to all chapters
                  </button>
                  {common.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        applyCommonResources(subject.id);
                        toast.success("Synced to all chapters");
                      }}
                      className="press inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
                    >
                      <Sparkles className="h-4 w-4" /> Sync
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          ) : null}
        </Card>

        <Card className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chapters"
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={cn(
                "shrink-0 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-secondary sm:text-sm",
                showArchived && "bg-secondary",
              )}
            >
              {showArchived ? "Archived" : "Active"}
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              addChapter(subject.id, name.trim());
              toast.success("Chapter added");
              setName("");
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New chapter"
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              className="press inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
        </Card>

        <div className="stagger space-y-2.5">
          {chapters.map((c) => {
            const pct = chapterPercent(c);
            const cq = chapterQuestions(c);
            const isCurrent = state.currentChapterId === c.id;
            return (
              <Link
                key={c.id}
                to="/subjects/$subjectId/$chapterId"
                params={{ subjectId: subject.id, chapterId: c.id }}
                className="block"
              >
                <div
                  className={cn(
                    "animate-pop glass-panel grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[22px] px-4 py-3.5 lift-hover",
                    isCurrent && "ring-1 ring-ring/50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="min-w-0 truncate text-[15px] font-semibold">{c.name}</h3>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
                          Focus
                        </span>
                      ) : null}
                      {isChapterComplete(c) ? (
                        <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
                          Done
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {c.resources.length} resources
                      {cq.total > 0 ? ` · ${cq.solved}/${cq.total} Qs` : ""}
                    </p>
                    <ProgressBar
                      className="mt-2 h-1.5"
                      value={pct}
                      tone={pct === 100 ? "success" : "primary"}
                    />
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{pct}%</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
          {chapters.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                {showArchived ? "Nothing archived yet." : "No chapters here yet — add one above."}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
