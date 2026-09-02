import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AnimatedCheck } from "@/components/study/animated-check";
import { AppShell, Card, SectionTitle } from "@/components/study/app-shell";

import { ProgressBar, ProgressRing } from "@/components/study/progress";
import { useStudy } from "@/lib/study/store";
import { isChapterComplete, subjectSyllabusStats, syllabusStats } from "@/lib/study/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus tracker — Photon" },
      {
        name: "description",
        content:
          "Build your syllabus subject by subject, add chapters and topics, and track chapter-wise completion with live overall progress.",
      },
      { property: "og:title", content: "Syllabus tracker — Photon" },
      {
        property: "og:description",
        content: "Chapter-wise syllabus completion with overall progress at a glance.",
      },
    ],
  }),
  component: SyllabusPage,
});

function SyllabusPage() {
  const { state, addSubject, addChapters, toggleChapterDone, deleteChapter, deleteSubject } =
    useStudy();
  const [subjectName, setSubjectName] = useState("");
  const [open, setOpen] = useState<string | null>(state.subjects[0]?.id ?? null);
  const overall = syllabusStats(state.subjects);

  return (
    <AppShell>
      <div className="animate-rise space-y-6">
        <SectionTitle eyebrow="Syllabus" title="Chapter-wise completion" />

        <Card className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="font-display text-4xl font-semibold tracking-tight">
              {overall.percent}%
              <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">
                of syllabus done
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {overall.completed} of {overall.total} chapters complete across{" "}
              {state.subjects.length} subjects.
            </p>
            <div className="mt-4 w-full max-w-sm">
              <ProgressBar value={overall.percent} />
            </div>
          </div>
          <ProgressRing value={overall.percent} sublabel="syllabus" />
        </Card>

        <Card>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const name = subjectName.trim();
              if (!name) return;
              addSubject(name);
              setSubjectName("");
              toast.success(`${name} added`);
            }}
          >
            <input
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="New subject — e.g. Organic Chemistry"
              className="flex-1 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add subject
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          {state.subjects.map((s) => {
            const st = subjectSyllabusStats(s);
            const isOpen = open === s.id;
            return (
              <Card key={s.id} className="p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold">{s.name}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <ProgressBar className="h-1.5 max-w-xs" value={st.percent} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {st.completed}/{st.total} chapters
                      </span>
                    </div>
                  </div>
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {st.percent}%
                  </span>
                </button>

                {isOpen ? (
                  <div className="animate-pop border-t border-glass-border px-5 py-4">
                    <ul className="space-y-2">
                      {s.chapters.map((c) => {
                        const done = isChapterComplete(c);
                        return (
                          <li
                            key={c.id}
                            className={cn(
                              "glass-inset group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-all duration-300",
                              done && "opacity-85",
                            )}
                          >
                            <AnimatedCheck
                              done={done}
                              onClick={() => toggleChapterDone(s.id, c.id)}
                              label={done ? "Mark incomplete" : "Mark complete"}
                              className="h-6 w-6"
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm transition-all duration-300",
                                done && "text-muted-foreground line-through",
                              )}
                            >
                              {c.name}
                            </span>

                            <button
                              type="button"
                              aria-label="Delete chapter"
                              onClick={() => deleteChapter(s.id, c.id)}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </li>
                        );
                      })}
                      {s.chapters.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No chapters yet — add them below.
                        </p>
                      ) : null}
                    </ul>

                    <ChapterAdder
                      onAdd={(names) => {
                        addChapters(s.id, names);
                        toast.success(`${names.length} chapter${names.length > 1 ? "s" : ""} added`);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => deleteSubject(s.id)}
                      className="mt-4 text-xs font-medium text-muted-foreground hover:text-destructive"
                    >
                      Delete subject
                    </button>
                  </div>
                ) : null}
              </Card>
            );
          })}
          {state.subjects.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                Add your first subject to start building the syllabus.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function ChapterAdder({ onAdd }: { onAdd: (names: string[]) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const names = value
          .split(/[,\n]/)
          .map((n) => n.trim())
          .filter(Boolean);
        if (names.length === 0) return;
        onAdd(names);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add chapters — separate with commas"
        className="flex-1 rounded-2xl border border-border bg-surface/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
      >
        <Plus className="h-4 w-4" /> Add
      </button>
    </form>
  );
}
