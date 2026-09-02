import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Copy, Flame, LogOut, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, SectionTitle } from "@/components/study/app-shell";
import { ProgressBar, ProgressRing } from "@/components/study/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStudy } from "@/lib/study/store";
import { activeChapters, overallStats, streakFrom, todayKey } from "@/lib/study/types";
import { addFriendByCode } from "@/lib/friends.functions";

export const Route = createFileRoute("/friends")({
  head: () => ({
    meta: [
      { title: "Friends sync — Photon" },
      {
        name: "description",
        content:
          "Share your 6-digit code to follow friends and see their real, live study progress, streaks and current chapters.",
      },
      { property: "og:title", content: "Friends sync — Photon" },
      {
        property: "og:description",
        content: "Real-time, view-only progress sharing with your study partners.",
      },
    ],
  }),
  component: FriendsPage,
});

type SubjectRow = { name: string; percent: number; chapters: number };
type ChapterRow = { subject: string; chapter: string; percent: number };
type GoalRow = { text: string; done: boolean; start: string | null; end: string | null };

type FriendView = {
  id: string;
  display_name: string;
  friend_code: string;
  snapshot: {
    percent: number;
    completed: number;
    total: number;
    streak: number;
    done_today: number;
    daily_goal: number;
    chapters_done: number;
    chapters_total: number;
    questions_solved: number;
    questions_total: number;
    study_minutes: number;
    goals_done: number;
    goals_total: number;
    goals: GoalRow[];
    subjects: SubjectRow[];
    current_chapters: ChapterRow[];
    updated_at: string;
  } | null;
};

function formatMinutes(min: number) {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function FriendsPage() {
  const { state, toggleSubjectHidden } = useStudy();
  const { user, profile, signOut, loading } = useAuth();
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const connectFriend = useServerFn(addFriendByCode);

  const me = overallStats(state.subjects);
  const myStreak = streakFrom(state.history);
  const myActive = activeChapters(state.subjects);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const { data: links, error } = await supabase
      .from("friendships")
      .select("friend_id")
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Could not load friends");
      setFetching(false);
      return;
    }
    const ids = (links ?? []).map((l) => l.friend_id);
    if (ids.length === 0) {
      setFriends([]);
      setFetching(false);
      return;
    }
    const [{ data: profiles }, { data: snaps }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, friend_code").in("id", ids),
      supabase.from("study_snapshots").select("*").in("user_id", ids),
    ]);
    setFriends(
      ids.map((id) => {
        const p = (profiles ?? []).find((x) => x.id === id);
        const s = (snaps ?? []).find((x) => x.user_id === id);
        return {
          id,
          display_name: p?.display_name ?? "Student",
          friend_code: p?.friend_code ?? "——————",
          snapshot: s
            ? {
                percent: s.percent,
                completed: s.completed,
                total: s.total,
                streak: s.streak,
                done_today: s.done_today,
                daily_goal: s.daily_goal,
                chapters_done: s.chapters_done ?? 0,
                chapters_total: s.chapters_total ?? 0,
                questions_solved: s.questions_solved ?? 0,
                questions_total: s.questions_total ?? 0,
                study_minutes: s.study_minutes ?? 0,
                goals_done: s.goals_done ?? 0,
                goals_total: s.goals_total ?? 0,
                goals: (s.goals as GoalRow[] | null) ?? [],
                subjects: (s.subjects as SubjectRow[]) ?? [],
                current_chapters: (s.current_chapters as ChapterRow[]) ?? [],
                updated_at: s.updated_at,
              }
            : null,
        };
      }),
    );
    setFetching(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // live updates whenever a friend's snapshot changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("friend-snapshots")
      .on("postgres_changes", { event: "*", schema: "public", table: "study_snapshots" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  if (loading) {
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
        <div className="animate-rise mx-auto max-w-lg space-y-5">
          <SectionTitle eyebrow="Friends" title="Sync with your study partners" />
          <Card className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Friends sync shows only real data from real accounts. Sign in to get your 6-digit code
              and follow your friends' live progress.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in to continue
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const addFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter a 6-digit code");
      return;
    }
    setBusy(true);
    try {
      await connectFriend({ data: { code } });
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message.replace(/^.*?:\s*/, "") : "Could not connect");
      return;
    }
    setBusy(false);
    setCode("");
    toast.success("Friend connected");
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("friendships").delete().eq("friend_id", id);
    setFriends((f) => f.filter((x) => x.id !== id));
  };

  return (
    <AppShell>
      <div className="animate-rise space-y-6">
        <SectionTitle
          eyebrow="Friends"
          title="Live progress sync"
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="grid h-10 w-10 place-items-center rounded-full border border-border transition-colors hover:bg-secondary"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Your code
            </p>
            <div className="mt-3 flex items-center gap-3">
              <p className="font-display text-[34px] font-semibold tracking-[0.24em] tabular-nums">
                {profile?.friend_code ?? "······"}
              </p>
              <button
                type="button"
                aria-label="Copy code"
                onClick={() => {
                  if (!profile) return;
                  void navigator.clipboard?.writeText(profile.friend_code);
                  toast.success("Code copied");
                }}
                className="press glass-inset grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-secondary/70"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex items-center gap-5">
              <ProgressRing value={me.percent} size={96} stroke={9} sublabel="you" />
              <div className="text-sm">
                <p className="font-semibold">{profile?.display_name ?? user.email}</p>
                <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <Flame className="h-4 w-4 text-warning" /> {myStreak} day streak ·{" "}
                  {state.history[todayKey()] ?? 0}/{state.dailyGoal} today
                </p>
                <p className="mt-1 text-muted-foreground">
                  {me.completed}/{me.total} items · {myActive.length} chapters in progress
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Add a friend
            </p>
            <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={addFriend}>
              <input
                value={code}
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                className="flex-1 rounded-2xl border border-border bg-surface/60 px-4 py-3 text-sm tracking-[0.3em] tabular-nums outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" /> Connect
              </button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              Following is view-only. Hide any subject below to keep it private.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {state.subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubjectHidden(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    s.hidden
                      ? "border-border text-muted-foreground line-through"
                      : "border-primary/40 bg-primary/10 text-foreground"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {friends.map((f) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold">{f.display_name}</h2>
                  <p className="text-xs tracking-[0.2em] tabular-nums text-muted-foreground">
                    #{f.friend_code}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to="/friends/$friendId"
                    params={{ friendId: f.id }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-primary/20"
                  >
                    Full progress <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  {f.snapshot ? (
                    <span className="glass-inset flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold">
                      <Flame className="h-4 w-4 text-warning" /> {f.snapshot.streak}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    aria-label="Remove friend"
                    onClick={() => void remove(f.id)}
                    className="press glass-inset grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-secondary/70"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {f.snapshot ? (
                <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr]">
                  <ProgressRing value={f.snapshot.percent} size={112} stroke={10} sublabel="done" />
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-3">
                      <Stat
                        label="Chapters"
                        value={`${f.snapshot.chapters_done}/${f.snapshot.chapters_total}`}
                      />
                      <Stat label="Items" value={`${f.snapshot.completed}/${f.snapshot.total}`} />
                      <Stat
                        label="Questions"
                        value={`${f.snapshot.questions_solved}/${f.snapshot.questions_total}`}
                      />
                      <Stat
                        label="Today"
                        value={`${f.snapshot.done_today}/${f.snapshot.daily_goal}`}
                      />
                      <Stat label="Study time" value={formatMinutes(f.snapshot.study_minutes)} />
                      <Stat
                        label="Goals"
                        value={`${f.snapshot.goals_done}/${f.snapshot.goals_total}`}
                      />
                    </div>

                    {f.snapshot.goals.length ? (
                      <div className="glass-inset space-y-1.5 rounded-2xl p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Today's targets
                        </p>
                        {f.snapshot.goals.slice(0, 5).map((g, i) => (
                          <div
                            key={`${g.text}-${i}`}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className={g.done ? "line-through text-muted-foreground" : ""}>
                              {g.text}
                            </span>
                            {g.start ? (
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {g.start}
                                {g.end ? `–${g.end}` : ""}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {f.snapshot.subjects.length ? (
                      <div className="space-y-2.5">
                        {f.snapshot.subjects.map((s) => (
                          <div key={s.name}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{s.name}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {s.chapters} ch · {s.percent}%
                              </span>
                            </div>
                            <ProgressBar className="mt-1.5 h-1.5" value={s.percent} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No shared subjects yet — they may have hidden them.
                      </p>
                    )}

                    {f.snapshot.current_chapters.length ? (
                      <div className="flex flex-wrap gap-2">
                        {f.snapshot.current_chapters.slice(0, 6).map((c) => (
                          <span
                            key={`${c.subject}-${c.chapter}`}
                            className="glass-inset rounded-full px-3 py-1.5 text-xs"
                          >
                            {c.chapter}
                            <span className="ml-1.5 tabular-nums text-muted-foreground">
                              {c.percent}%
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <p className="text-[11px] text-muted-foreground">
                      Updated {new Date(f.snapshot.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  This friend hasn't synced any progress yet.
                </p>
              )}
            </Card>
          ))}

          {friends.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">
                No friends yet. Share your code or add theirs to compare real progress.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-inset rounded-2xl p-3">
      <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}
