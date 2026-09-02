import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, SectionTitle } from "@/components/study/app-shell";
import { ProgressBar } from "@/components/study/progress";
import { useStudy } from "@/lib/study/store";
import {
  isChapterActive,
  subjectQuestions,
  subjectStats,
  subjectSyllabusStats,
} from "@/lib/study/types";


export const Route = createFileRoute("/subjects/")({
  head: () => ({
    meta: [
      { title: "Subjects — Photon" },
      {
        name: "description",
        content:
          "All your subjects with live progress, active chapters and one-tap access to lectures, DPPs, PYQs and revision.",
      },
      { property: "og:title", content: "Subjects — Photon" },
      { property: "og:description", content: "Live subject progress in one clean view." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { state, addSubject } = useStudy();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");

  const list = state.subjects.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <div className="animate-rise space-y-5">
        <SectionTitle eyebrow="Library" title="Subjects" />

        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-surface/60 px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subjects"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = name.trim();
              if (!n) return;
              addSubject(n);
              setName("");
              toast.success(`${n} added`);
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New subject"
              className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 sm:w-44"
            />
            <button
              type="submit"
              aria-label="Add subject"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((s) => {
            const st = subjectStats(s);
            const syl = subjectSyllabusStats(s);
            const qs = subjectQuestions(s);
            const active = s.chapters.filter(isChapterActive).length;
            return (
              <Link key={s.id} to="/subjects/$subjectId" params={{ subjectId: s.id }}>
                <Card className="h-full lift-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-xl font-semibold">{s.name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {syl.completed}/{syl.total} chapters · {active} in progress
                      </p>
                    </div>
                    <span className="font-display text-2xl font-semibold tabular-nums">
                      {st.percent}%
                    </span>
                  </div>
                  <ProgressBar className="mt-4 h-2" value={st.percent} />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                      Open <ArrowRight className="h-4 w-4" />
                    </p>
                    {qs.total > 0 ? (
                      <span className="rounded-full border border-border/70 bg-surface/50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {qs.solved}/{qs.total} questions solved
                      </span>
                    ) : null}
                  </div>
                </Card>
              </Link>
            );
          })}
          {list.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                No subjects here yet — add one above or build your syllabus.
              </p>
            </Card>
          ) : null}

        </div>
      </div>
    </AppShell>
  );
}
