import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Clock, Flame, Plus, Target, Trash2, CheckCircle2 } from "lucide-react";
import { AnimatedCheck } from "@/components/study/animated-check";
import { AppShell, Card } from "@/components/study/app-shell";
import { ProgressBar, ProgressRing } from "@/components/study/progress";

import { useStudy } from "@/lib/study/store";
import {
  activeChapters,
  formatTimeBlock,
  overallQuestions,
  overallStats,

  streakFrom,
  subjectStats,
  syllabusStats,
  todayKey,
} from "@/lib/study/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Photon — Track your syllabus beautifully" },
      {
        name: "description",
        content:
          "Photon tracks your syllabus chapter-wise with daily goals, time blocks, streaks and live friend sync.",
      },
      { property: "og:title", content: "Photon — Track your syllabus beautifully" },
      {
        property: "og:description",
        content: "Daily targets with time blocks, chapter-wise syllabus progress and friend sync.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, ready, addGoal, toggleGoal, deleteGoal } = useStudy();
  const overall = overallStats(state.subjects);
  const questions = overallQuestions(state.subjects);

  const syllabus = syllabusStats(state.subjects);
  const streak = streakFrom(state.history);
  const doneToday = state.history[todayKey()] ?? 0;
  const goalPct = Math.min(100, Math.round((doneToday / state.dailyGoal) * 100));
  const goals = state.plans[todayKey()] ?? [];
  const current = activeChapters(state.subjects, state.currentChapterId).filter((c) => c.started);
  const visible = current.slice(0, 6);



  const [text, setText] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <AppShell>
      <div className="animate-rise min-w-0 space-y-4 sm:space-y-5">
        <section className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card className="flex min-w-0 flex-col justify-between gap-6 sm:gap-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Overall syllabus
              </p>
              <h1 className="mt-2.5 font-display text-[30px] font-semibold leading-tight tracking-tight min-[380px]:text-[34px] sm:text-[42px] sm:leading-none">
                {syllabus.total ? syllabus.percent : overall.percent}%{" "}
                <span className="text-gradient-brand">complete</span>
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {syllabus.completed} of {syllabus.total} chapters done · {overall.completed}/
                {overall.total} tracked items across {state.subjects.length} subjects.
              </p>
              {questions.total > 0 ? (
                <p className="mt-2 text-sm font-semibold tabular-nums text-primary">
                  {questions.solved} of {questions.total} questions solved
                </p>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:flex-1 sm:grid-cols-3 sm:gap-3">
                <Metric icon={CheckCircle2} label="Done" value={overall.completed} />
                <Metric icon={Clock} label="Left" value={overall.remaining} />
                <Metric icon={Flame} label="Streak" value={`${streak}d`} />
                {questions.total > 0 ? (
                  <Metric icon={CheckCircle2} label="Questions" value={questions.solved} />
                ) : null}
              </div>

              <div className="shrink-0">
                <ProgressRing
                  value={syllabus.total ? syllabus.percent : overall.percent}
                  sublabel="syllabus"
                />
              </div>
            </div>

          </Card>

          <Card className="flex min-w-0 flex-col">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Today's target
                </p>
                <p className="mt-1.5 font-display text-[28px] font-semibold leading-none tabular-nums">
                  {doneToday}
                  <span className="text-muted-foreground">/{state.dailyGoal}</span>
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {goals.filter((g) => g.done).length}/{goals.length || 0} goals ticked
                </p>
              </div>
              <ProgressRing value={goalPct} size={84} stroke={8} sublabel="goal" />
            </div>

            <ul className="mt-5 space-y-2">
              {goals.map((g) => {
                const block = formatTimeBlock(g.start, g.end);
                return (
                  <li
                    key={g.id}
                    className={cn(
                      "glass-inset group flex items-start gap-3 rounded-2xl px-3.5 py-2.5 transition-all duration-300",
                      g.done && "opacity-80",
                    )}
                  >
                    <AnimatedCheck
                      done={g.done}
                      onClick={() => toggleGoal(g.id)}
                      label={g.done ? "Mark undone" : "Mark done"}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium transition-all duration-300",
                          g.done && "text-muted-foreground line-through",
                        )}
                      >
                        {g.text}
                      </p>

                      {block ? (
                        <p className="mt-0.5 font-display text-[11px] tracking-[0.14em] text-primary">
                          {block}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      aria-label="Delete goal"
                      onClick={() => deleteGoal(g.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </li>
                );
              })}
              {goals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add today's goals — with optional time blocks.
                </p>
              ) : null}
            </ul>

            <form
              className="mt-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = text.trim();
                if (!t) return;
                addGoal(t, start || undefined, end || undefined);
                setText("");
                setStart("");
                setEnd("");
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Finish Kinematics DPP"
                className="w-full rounded-2xl border border-border bg-surface/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-2">
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="min-w-0 rounded-2xl border border-border bg-surface/60 px-2 py-2.5 text-xs tabular-nums outline-none focus:ring-2 focus:ring-ring/40 sm:px-3 sm:text-sm"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="min-w-0 rounded-2xl border border-border bg-surface/60 px-2 py-2.5 text-xs tabular-nums outline-none focus:ring-2 focus:ring-ring/40 sm:px-3 sm:text-sm"
                />
                <button
                  type="submit"
                  aria-label="Add goal"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </form>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Current chapters · {current.length}
              </p>
              <Link
                to="/subjects"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80"
              >
                Manage <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {visible.map(({ subject, chapter, percent, focused }, i) => (
                <Link
                  key={chapter.id}
                  to="/subjects/$subjectId"
                  params={{ subjectId: subject.id }}
                  style={{ animationDelay: `${i * 45}ms` }}
                  className={cn(
                    "animate-pop glass-inset rounded-2xl p-4 lift-hover press",
                    focused && "border-primary/45 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {subject.name}
                    </p>
                    {focused ? (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
                        Focus
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate font-display text-[15px] font-semibold">
                    {chapter.name}
                  </p>
                  <div className="mt-3 flex items-center gap-2.5">
                    <ProgressBar className="h-1.5" value={percent} />
                    <span className="text-xs font-semibold tabular-nums">{percent}%</span>
                  </div>
                </Link>
              ))}
              {current.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active chapter yet. Open a subject and tap the ✦ button on a chapter to make it
                  active.
                </p>
              ) : null}

            </div>
            {current.length > visible.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                +{current.length - visible.length} more pending chapters
              </p>
            ) : null}
          </Card>


          <Card>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Subject-wise progress
              </p>
            </div>
            <div className="mt-4 space-y-3.5">
              {state.subjects.map((s) => {
                const st = subjectStats(s);
                return (
                  <Link
                    key={s.id}
                    to="/subjects/$subjectId"
                    params={{ subjectId: s.id }}
                    className="block rounded-2xl p-2 transition-colors hover:bg-secondary/60"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
                      <span className="truncate font-semibold">{s.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{st.percent}%</span>
                    </div>
                    <ProgressBar className="mt-2 h-1.5" value={st.percent} />
                  </Link>
                );
              })}
              {ready && state.subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add your first subject in the Syllabus tab.
                </p>
              ) : null}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass-inset min-w-0 rounded-2xl p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 font-display text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
  );
}
