import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Flame,
  History,
  ListChecks,
  Lock,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, SectionTitle } from "@/components/study/app-shell";
import { ProgressBar, ProgressRing } from "@/components/study/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  chapterPercent,
  chapterQuestions,
  chapterStats,
  isChapterComplete,
  overallQuestions,
  overallStats,
  resourceItems,
  resourceStats,
  subjectStats,
  subjectSyllabusStats,
  syllabusStats,
  type Chapter,
  type Goal,
  type Resource,
  type ResourceItem,
  type Subject,
} from "@/lib/study/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/friends_/$friendId")({
  head: () => ({
    meta: [
      { title: "Friend progress — Photon" },
      {
        name: "description",
        content:
          "Drill into a study partner's real synced progress: subjects, chapters, resources and every individual item.",
      },
      { property: "og:title", content: "Friend progress — Photon" },
      {
        property: "og:description",
        content: "View-only access to a friend's real, live study tracking data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FriendDetailPage,
});

type SharedData = {
  subjects?: Subject[];
  history?: Record<string, number>;
  plans?: Record<string, Goal[]>;
  dailyGoal?: number;
  revisionIntervals?: number[];
};

type SubjectSummary = { name: string; percent: number; chapters: number };
type ChapterSummary = { subject: string; chapter: string; percent: number };

type SnapshotSummary = {
  percent: number;
  completed: number;
  total: number;
  chapters_done: number;
  chapters_total: number;
  questions_solved: number;
  questions_total: number;
  goals_done: number;
  goals_total: number;
  goals: GoalSummary[];
  subjects: SubjectSummary[];
  current_chapters: ChapterSummary[];
};

type GoalSummary = {
  text: string;
  done: boolean;
  start: string | null;
  end: string | null;
};

type FriendDetail = {
  display_name: string;
  friend_code: string;
  streak: number;
  done_today: number;
  daily_goal: number;
  study_minutes: number;
  updated_at: string;
  shared: SharedData;
  summary: SnapshotSummary;
};

function formatMinutes(min: number) {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function asSharedData(value: unknown): SharedData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const history = record.history;
  const plans = record.plans;
  return {
    subjects: Array.isArray(record.subjects) ? (record.subjects as Subject[]) : undefined,
    history:
      history && typeof history === "object" && !Array.isArray(history)
        ? (history as Record<string, number>)
        : undefined,
    plans:
      plans && typeof plans === "object" && !Array.isArray(plans)
        ? (plans as Record<string, Goal[]>)
        : undefined,
    dailyGoal: typeof record.dailyGoal === "number" ? record.dailyGoal : undefined,
    revisionIntervals: Array.isArray(record.revisionIntervals)
      ? (record.revisionIntervals as number[])
      : undefined,
  };
}

function FriendDetailPage() {
  const { friendId } = Route.useParams();
  const { user, loading } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "empty">("loading");
  const [friend, setFriend] = useState<FriendDetail | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: link, error: linkError } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("friend_id", friendId)
      .maybeSingle();
    if (linkError) {
      toast.error("Could not verify this connection");
      setState("forbidden");
      return;
    }
    if (!link) {
      setState("forbidden");
      return;
    }

    const [profileResult, snapshotResult] = await Promise.all([
      supabase.from("profiles").select("display_name, friend_code").eq("id", friendId).maybeSingle(),
      supabase.from("study_snapshots").select("*").eq("user_id", friendId).maybeSingle(),
    ]);
    if (profileResult.error || snapshotResult.error) {
      toast.error("Could not load this friend's data");
      setState("forbidden");
      return;
    }
    if (!profileResult.data || !snapshotResult.data) {
      setState("empty");
      setFriend(null);
      return;
    }

    const snap = snapshotResult.data;
    setFriend({
      display_name: profileResult.data.display_name,
      friend_code: profileResult.data.friend_code,
      streak: snap.streak,
      done_today: snap.done_today,
      daily_goal: snap.daily_goal,
      study_minutes: snap.study_minutes,
      updated_at: snap.updated_at,
      shared: asSharedData(snap.shared_data),
      summary: {
        percent: snap.percent,
        completed: snap.completed,
        total: snap.total,
        chapters_done: snap.chapters_done,
        chapters_total: snap.chapters_total,
        questions_solved: snap.questions_solved,
        questions_total: snap.questions_total,
        goals_done: snap.goals_done,
        goals_total: snap.goals_total,
        goals: (snap.goals as GoalSummary[] | null) ?? [],
        subjects: (snap.subjects as SubjectSummary[] | null) ?? [],
        current_chapters: (snap.current_chapters as ChapterSummary[] | null) ?? [],
      },
    });
    setState("ok");
  }, [friendId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`friend-detail-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_snapshots",
          filter: `user_id=eq.${friendId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [friendId, user, load]);

  if (loading || (state === "loading" && user)) {
    return (
      <AppShell>
        <Card>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </Card>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <Card className="space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to view your friends' progress.</p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </Card>
      </AppShell>
    );
  }

  if (state === "forbidden") {
    return (
      <AppShell>
        <Card className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="h-4 w-4" /> Not connected
          </p>
          <p className="text-sm text-muted-foreground">
            You can only view the progress of students you have connected with using their 6-digit
            code.
          </p>
          <BackLink />
        </Card>
      </AppShell>
    );
  }

  if (state === "empty" || !friend) {
    return (
      <AppShell>
        <Card className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This friend hasn't synced any study data yet.
          </p>
          <BackLink />
        </Card>
      </AppShell>
    );
  }

  const subjects = (friend.shared.subjects ?? []).filter((subject) => !subject.hidden);
  const hasFullTree = subjects.length > 0;
  const overall = hasFullTree
    ? overallStats(subjects)
    : {
        total: friend.summary.total,
        completed: friend.summary.completed,
        remaining: Math.max(friend.summary.total - friend.summary.completed, 0),
        percent: friend.summary.percent,
      };
  const syllabus = hasFullTree
    ? syllabusStats(subjects)
    : {
        total: friend.summary.chapters_total,
        completed: friend.summary.chapters_done,
        remaining: Math.max(friend.summary.chapters_total - friend.summary.chapters_done, 0),
        percent:
          friend.summary.chapters_total === 0
            ? 0
            : Math.round((friend.summary.chapters_done / friend.summary.chapters_total) * 100),
      };
  const questions = hasFullTree
    ? overallQuestions(subjects)
    : {
        total: friend.summary.questions_total,
        solved: friend.summary.questions_solved,
        percent:
          friend.summary.questions_total === 0
            ? 0
            : Math.round((friend.summary.questions_solved / friend.summary.questions_total) * 100),
      };

  return (
    <AppShell>
      <div className="animate-rise space-y-6">
        <BackLink />
        <SectionTitle
          eyebrow={`#${friend.friend_code}`}
          title={friend.display_name}
          action={
            <span className="glass-inset flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold">
              <Flame className="h-4 w-4 text-warning" /> {friend.streak}
            </span>
          }
        />

        <Card>
          <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
            <ProgressRing
              value={syllabus.total ? syllabus.percent : overall.percent}
              size={112}
              stroke={10}
              sublabel="done"
            />
            <div className="grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-3">
              <Stat label="Chapters" value={`${syllabus.completed}/${syllabus.total}`} />
              <Stat label="Items" value={`${overall.completed}/${overall.total}`} />
              <Stat label="Questions" value={`${questions.solved}/${questions.total}`} />
              <Stat label="Today" value={`${friend.done_today}/${friend.daily_goal}`} />
              <Stat label="Study time" value={formatMinutes(friend.study_minutes)} />
              <Stat
                label="Goals"
                value={`${friend.summary.goals_done}/${friend.summary.goals_total}`}
              />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Real synced data · updated {new Date(friend.updated_at).toLocaleString()}
          </p>
        </Card>

        <SyncedActivity shared={friend.shared} summary={friend.summary} />

        {hasFullTree ? (
          <div className="space-y-4">
            {subjects.map((subject) => <SubjectBlock key={subject.id} subject={subject} />)}
          </div>
        ) : friend.summary.subjects.length ? (
          <LegacySubjectSummary subjects={friend.summary.subjects} />
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">
              No shared subjects — your friend has hidden them from friends.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function BackLink() {
  return (
    <Link
      to="/friends"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to friends
    </Link>
  );
}

function SyncedActivity({
  shared,
  summary,
}: {
  shared: SharedData;
  summary: SnapshotSummary;
}) {
  const [open, setOpen] = useState(false);
  const history = Object.entries(shared.history ?? {}).sort(([a], [b]) => b.localeCompare(a));
  const plans = Object.entries(shared.plans ?? {}).sort(([a], [b]) => b.localeCompare(a));
  const goals = plans.length ? plans.flatMap(([date, items]) => items.map((goal) => ({ date, goal }))) : [];

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
          <History className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Synced activity</h2>
          <p className="text-xs text-muted-foreground">
            {history.length} history days · {goals.length || summary.goals.length} goals ·{" "}
            {(shared.revisionIntervals ?? []).length} revision intervals
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="mt-4 space-y-5 border-t border-border/60 pt-4">
          {history.length ? (
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <History className="h-3.5 w-3.5" /> Completed history
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {history.map(([date, count]) => (
                  <div key={date} className="glass-inset flex items-center justify-between rounded-xl px-3 py-2 text-sm">
                    <span>{date}</span>
                    <span className="font-semibold tabular-nums">{count} items</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {goals.length || summary.goals.length ? (
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Target className="h-3.5 w-3.5" /> Plans and goals
              </p>
              <div className="mt-2 space-y-2">
                {(goals.length ? goals : summary.goals.map((goal) => ({ date: "Today", goal }))).map(
                  ({ date, goal }, index) => (
                    <div key={`${date}-${goal.id}-${index}`} className="glass-inset flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm">
                      <span className={cn("min-w-0", goal.done && "text-muted-foreground line-through")}>
                        <span className="mr-2 text-xs text-muted-foreground">{date}</span>
                        {goal.text}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {goal.start ? `${goal.start}${goal.end ? `–${goal.end}` : ""}` : goal.done ? "Done" : "Open"}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {summary.current_chapters.length ? (
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> Current chapters
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {summary.current_chapters.map((chapter) => (
                  <span key={`${chapter.subject}-${chapter.chapter}`} className="glass-inset rounded-full px-3 py-1.5 text-xs">
                    {chapter.subject} · {chapter.chapter} · {chapter.percent}%
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {(shared.revisionIntervals ?? []).length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Revision intervals
              </p>
              <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                {shared.revisionIntervals?.join(" · ")} days
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function LegacySubjectSummary({ subjects }: { subjects: SubjectSummary[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-semibold">Shared subject summary</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        These are the real summary fields from an older snapshot. The full subject tree will appear after the next sync.
      </p>
      <div className="mt-4 space-y-3">
        {subjects.map((subject) => (
          <div key={subject.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{subject.name}</span>
              <span className="tabular-nums text-muted-foreground">{subject.chapters} chapters · {subject.percent}%</span>
            </div>
            <ProgressBar className="mt-1.5 h-1.5" value={subject.percent} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function SubjectBlock({ subject }: { subject: Subject }) {
  const [open, setOpen] = useState(false);
  const stats = subjectStats(subject);
  const syllabus = subjectSyllabusStats(subject);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">{subject.name}</h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            {syllabus.completed}/{syllabus.total} chapters · {stats.completed}/{stats.total} items · {stats.percent}%
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <ProgressBar className="mt-2.5 h-1.5" value={stats.percent} />

      {open ? (
        <div className="mt-4 space-y-2.5">
          {subject.commonResources?.length ? (
            <div className="border-b border-border/60 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Common resource templates
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {subject.commonResources.map((resource) => `${resource.name} (${resource.total})`).join(" · ")}
              </p>
            </div>
          ) : null}
          {subject.chapters.length ? (
            subject.chapters.map((chapter) => <ChapterBlock key={chapter.id} chapter={chapter} />)
          ) : (
            <p className="text-sm text-muted-foreground">No chapters added yet.</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function ChapterBlock({ chapter }: { chapter: Chapter }) {
  const [open, setOpen] = useState(false);
  const stats = chapterStats(chapter);
  const percent = chapterPercent(chapter);
  const questions = chapterQuestions(chapter);
  const done = isChapterComplete(chapter);
  const revisions = chapter.revisions ?? [];

  return (
    <div className="glass-inset rounded-2xl p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
            done ? "border-transparent bg-brand text-primary-foreground" : "border-border",
          )}
        >
          {done ? <Check className="h-3 w-3" /> : null}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{chapter.name}</span>
        {chapter.archived ? <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Archived</span> : null}
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{percent}%</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <ProgressBar className="mt-2 h-1.5" value={percent} tone={percent === 100 ? "success" : "primary"} />

      {open ? (
        <div className="mt-3 space-y-2.5">
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {stats.completed}/{stats.total} items · {stats.remaining} left
            {questions.total ? ` · ${questions.solved}/${questions.total} questions` : ""}
            {chapter.completionDate ? ` · completed ${chapter.completionDate}` : ""}
          </p>

          {chapter.resources.length ? (
            chapter.resources.map((resource) => <ReadOnlyResource key={resource.id} resource={resource} />)
          ) : (
            <p className="text-xs text-muted-foreground">No resources tracked in this chapter.</p>
          )}

          {revisions.length ? (
            <div className="border-t border-border/60 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Revisions</p>
              <div className="mt-2 space-y-1.5">
                {revisions.map((revision) => (
                  <div key={revision.id} className="flex items-center justify-between gap-3 text-xs">
                    <span>D+{revision.interval} · due {revision.dueDate}</span>
                    <span className={revision.completed ? "text-success" : "text-muted-foreground"}>
                      {revision.completed ? `Completed${revision.completedAt ? ` ${revision.completedAt}` : ""}` : "Open"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReadOnlyResource({ resource }: { resource: Resource }) {
  const [open, setOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const stats = resourceStats(resource);
  const items = resourceItems(resource);
  const label = resource.name.trim() || "Item";
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  return (
    <div className="rounded-2xl border border-border/60 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <ListChecks className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums">{stats.completed}/{stats.total}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{stats.percent}%</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <ProgressBar className="mt-2 h-1.5" value={stats.percent} tone={stats.percent === 100 ? "success" : "primary"} />

      {open ? (
        <div className="mt-3 space-y-2.5 border-t border-border/60 pt-3">
          <p className="text-[11px] text-muted-foreground">
            {stats.completed} completed · {stats.remaining} remaining
            {resource.questions ? ` · ${resource.questionsDone ?? 0}/${resource.questions} questions` : ""}
          </p>
          {items.length ? (
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selectedItemId === item.id}
                  aria-label={`${label} ${item.position}${item.done ? " completed" : " remaining"}`}
                  onClick={() => setSelectedItemId((current) => (current === item.id ? null : item.id))}
                  className={cn(
                    "grid h-7 min-w-7 place-items-center rounded-lg border px-2 text-[11px] font-semibold tabular-nums transition-colors",
                    selectedItemId === item.id
                      ? "border-ring bg-secondary text-foreground ring-2 ring-ring/30"
                      : item.done
                        ? "border-transparent bg-brand text-primary-foreground"
                        : "border-border bg-background/50 text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {item.done ? <Check className="h-3 w-3" /> : item.position}
                </button>
              ))}
            </div>
          ) : null}
          {selectedItem ? <ItemDetail label={label} item={selectedItem} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function ItemDetail({ label, item }: { label: string; item: ResourceItem }) {
  return (
    <div className="glass-inset rounded-xl px-3 py-2.5 text-xs">
      <p className="font-semibold">{label} {item.position}</p>
      <p className="mt-1 text-muted-foreground">
        Status: {item.done ? "Completed" : "Not completed"}
        {item.completedAt ? ` · completed ${item.completedAt}` : ""}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inset rounded-2xl px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}