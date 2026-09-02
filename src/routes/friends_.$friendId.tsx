import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Flame, ListChecks, Lock } from "lucide-react";
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
          "Drill into a study partner's real synced progress: subjects, chapters and every individual resource item.",
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
};

function formatMinutes(min: number) {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function FriendDetailPage() {
  const { friendId } = Route.useParams();
  const { user, loading } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "forbidden" | "empty">("loading");
  const [friend, setFriend] = useState<FriendDetail | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    // permission: the friendship row is only visible to its owner under RLS
    const { data: link } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("friend_id", friendId)
      .maybeSingle();
    if (!link) {
      setState("forbidden");
      return;
    }
    const [{ data: profile }, { data: snap, error }] = await Promise.all([
      supabase.from("profiles").select("display_name, friend_code").eq("id", friendId).maybeSingle(),
      supabase.from("study_snapshots").select("*").eq("user_id", friendId).maybeSingle(),
    ]);
    if (error) {
      toast.error("Could not load this friend's data");
      setState("forbidden");
      return;
    }
    if (!snap) {
      setState("empty");
      setFriend(null);
      return;
    }
    setFriend({
      display_name: profile?.display_name ?? "Student",
      friend_code: profile?.friend_code ?? "——————",
      streak: snap.streak ?? 0,
      done_today: snap.done_today ?? 0,
      daily_goal: snap.daily_goal ?? 0,
      study_minutes: snap.study_minutes ?? 0,
      updated_at: snap.updated_at,
      shared: (snap.shared_data as SharedData | null) ?? {},
    });
    setState("ok");
  }, [friendId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  // real-time: refresh as soon as this friend syncs new progress
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

  const subjects = (friend.shared.subjects ?? []).filter((s) => !s.hidden);
  const overall = overallStats(subjects);
  const syllabus = syllabusStats(subjects);
  const questions = overallQuestions(subjects);

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
              <Stat label="Subjects" value={String(subjects.length)} />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Real synced data · updated {new Date(friend.updated_at).toLocaleString()}
          </p>
        </Card>

        {subjects.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No shared subjects — your friend has hidden them from friends.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {subjects.map((subject) => (
              <SubjectBlock key={subject.id} subject={subject} />
            ))}
          </div>
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

function SubjectBlock({ subject }: { subject: Subject }) {
  const [open, setOpen] = useState(false);
  const stats = subjectStats(subject);
  const syllabus = subjectSyllabusStats(subject);
  const chapters = subject.chapters.filter((c) => !c.archived);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">{subject.name}</h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            {syllabus.completed}/{syllabus.total} chapters · {stats.completed}/{stats.total} items ·{" "}
            {stats.percent}%
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      <ProgressBar className="mt-2.5 h-1.5" value={stats.percent} />

      {open ? (
        <div className="mt-4 space-y-2.5">
          {chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chapters added yet.</p>
          ) : (
            chapters.map((chapter) => <ChapterBlock key={chapter.id} chapter={chapter} />)
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
  const revisions = (chapter.revisions ?? []).filter((r) => !r.completed);

  return (
    <div className="glass-inset rounded-2xl p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {percent}%
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <ProgressBar
        className="mt-2 h-1.5"
        value={percent}
        tone={percent === 100 ? "success" : "primary"}
      />

      {open ? (
        <div className="mt-3 space-y-2.5">
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {stats.completed}/{stats.total} items · {stats.remaining} left
            {questions.total ? ` · ${questions.solved}/${questions.total} questions` : ""}
            {chapter.completionDate ? ` · completed ${chapter.completionDate}` : ""}
          </p>

          {chapter.resources.length === 0 ? (
            <p className="text-xs text-muted-foreground">No resources tracked in this chapter.</p>
          ) : (
            chapter.resources.map((resource) => (
              <ReadOnlyResource key={resource.id} resource={resource} />
            ))
          )}

          {revisions.length ? (
            <p className="text-[11px] text-muted-foreground">
              Next revisions:{" "}
              {revisions
                .slice(0, 4)
                .map((r) => `${r.dueDate} (D+${r.interval})`)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReadOnlyResource({ resource }: { resource: Resource }) {
  const stats = resourceStats(resource);
  const items = resourceItems(resource);
  const label = resource.name.trim() || "Item";

  return (
    <div className="rounded-2xl border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {stats.completed}/{stats.total}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {stats.percent}%
        </span>
      </div>
      <ProgressBar
        className="mt-2 h-1.5"
        value={stats.percent}
        tone={stats.percent === 100 ? "success" : "primary"}
      />
      {items.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.id}
              aria-label={`${label} ${item.position}${item.done ? " completed" : " remaining"}`}
              className={cn(
                "grid h-7 min-w-7 place-items-center rounded-lg border px-2 text-[11px] font-semibold tabular-nums",
                item.done
                  ? "border-transparent bg-brand text-primary-foreground"
                  : "border-border bg-background/50 text-muted-foreground",
              )}
            >
              {item.done ? <Check className="h-3 w-3" /> : item.position}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {stats.completed} completed · {stats.remaining} remaining
        {resource.questions
          ? ` · ${resource.questionsDone ?? 0}/${resource.questions} questions`
          : ""}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inset rounded-2xl px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-display text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
