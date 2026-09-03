import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  activeChapters,
  chapterPercent,
  DEFAULT_REVISION_INTERVALS,
  defaultState,
  emptyState,
  overallQuestions,
  overallStats,
  PALETTES,

  streakFrom,
  subjectStats,
  syllabusStats,
  todayKey,
  uid,
  makeRevisions,
  type Chapter,
  type Goal,
  type PaletteId,
  type Resource,
  type ResourceItem,

  type Revision,
  type ResourceTemplate,
  type StudyState,
  type Subject,
} from "./types";

const KEY = "preparationstat:v1";
const LEGACY_KEY = "studyflow:v1";

type Ctx = {
  state: StudyState;
  ready: boolean;
  update: (fn: (draft: StudyState) => void) => void;
  // subjects
  addSubject: (name: string) => void;
  renameSubject: (id: string, name: string) => void;
  deleteSubject: (id: string) => void;
  toggleSubjectHidden: (id: string) => void;
  moveSubject: (id: string, dir: -1 | 1) => void;
  // chapters
  addChapter: (subjectId: string, name: string) => void;
  addChapters: (subjectId: string, names: string[]) => void;
  renameChapter: (subjectId: string, id: string, name: string) => void;
  deleteChapter: (subjectId: string, id: string) => void;
  toggleArchive: (subjectId: string, id: string) => void;
  toggleChapterDone: (subjectId: string, id: string) => void;
  resetChapter: (subjectId: string, id: string) => void;
  setChapterCompletionDate: (subjectId: string, id: string, date: string) => void;
  completeRevision: (subjectId: string, chapterId: string, revisionId: string) => void;
  setRevisionIntervals: (intervals: number[]) => void;
  reorderChapter: (subjectId: string, fromId: string, toId: string) => void;
  setCurrentChapter: (id: string) => void;
  // resources
  addResource: (
    subjectId: string,
    chapterId: string,
    name: string,
    total: number,
    questions?: number,
  ) => void;

  updateResource: (
    subjectId: string,
    chapterId: string,
    resourceId: string,
    patch: Partial<Resource>,
  ) => void;
  deleteResource: (subjectId: string, chapterId: string, resourceId: string) => void;
  reorderResource: (subjectId: string, chapterId: string, fromId: string, toId: string) => void;
  // subject-level common resources (mirrored into every chapter)
  addCommonResource: (subjectId: string, name: string, total: number, questions?: number) => void;
  deleteCommonResource: (subjectId: string, templateId: string) => void;
  applyCommonResources: (subjectId: string) => void;
  bumpProgress: (subjectId: string, chapterId: string, resourceId: string, delta: number) => void;
  toggleResourceItem: (
    subjectId: string,
    chapterId: string,
    resourceId: string,
    itemId: string,
  ) => void;
  setResourceItemsDone: (
    subjectId: string,
    chapterId: string,
    resourceId: string,
    done: boolean,
  ) => void;
  // today's plan
  addGoal: (text: string, start?: string, end?: string) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  // misc
  setTheme: (theme: "light" | "dark") => void;
  setPalette: (palette: PaletteId) => void;
  setDailyGoal: (n: number) => void;
  clearAllData: () => void;
};

const StudyContext = createContext<Ctx | null>(null);

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function migrate(raw: Partial<StudyState>): StudyState {
  const base = emptyState();
  const merged = { ...base, ...raw } as StudyState;
  merged.plans = merged.plans ?? {};
  merged.palette = PALETTES.some((p) => p.id === merged.palette) ? merged.palette : "photon";
  merged.revisionIntervals = (merged.revisionIntervals ?? DEFAULT_REVISION_INTERVALS).filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  if (merged.revisionIntervals.length === 0) merged.revisionIntervals = DEFAULT_REVISION_INTERVALS;
  merged.subjects = (merged.subjects ?? []).map((s) => ({
    ...s,
    commonResources: s.commonResources ?? [],
    chapters: (s.chapters ?? []).map((c) => ({
      ...c,
      done: c.done ?? false,
      resources: c.resources ?? [],
      revisions: c.revisions ?? [],
      completionDate: c.completionDate,
    })),
  }));
  merged.subjects.forEach((s) =>
    s.chapters.forEach((c) =>
      c.resources.forEach((r) => {
        const items = r.items ?? [];
        if (items.length < r.total) {
          r.items = [
            ...items,
            ...Array.from({ length: r.total - items.length }, (_, index) => ({
              id: uid(),
              position: items.length + index + 1,
              done: items.length + index < r.completed,
              ...(items.length + index < r.completed ? { completedAt: todayKey() } : {}),
            })),
          ];
        } else {
          r.items = items.slice(0, r.total).map((item, index) => ({
            ...item,
            position: index + 1,
          }));
        }
        r.completed = r.items.filter((item) => item.done).length;
      }),
    ),
  );
  return merged;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudyState>(() => defaultState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (raw) setState(migrate(JSON.parse(raw) as Partial<StudyState>));
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  useEffect(() => {
    const root = document.documentElement;
    // Animate palette/mode swaps: a short-lived class enables colour transitions
    // so switching never flashes, while normal interactions stay instant.
    root.classList.add("theme-animating");
    root.classList.toggle("dark", state.theme === "dark");
    root.dataset["palette"] = state.palette ?? "photon";
    const timeout = window.setTimeout(() => root.classList.remove("theme-animating"), 480);

    // Keep the mobile status-bar tint in sync with the resolved palette colour.
    const frame = window.requestAnimationFrame(() => {
      const raw = getComputedStyle(document.body).backgroundColor;
      if (!raw) return;
      // Tokens are authored in oklch(); browsers only tint the status bar for
      // legacy colour syntaxes, so normalise through a canvas first.
      let bg = raw;
      try {
        const ctx = document.createElement("canvas").getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#000000";
          ctx.fillStyle = raw;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          bg = `#${[r, g, b]
            .map((v) => (v ?? 0).toString(16).padStart(2, "0"))
            .join("")}`;
        }
      } catch {
        bg = raw;
      }

      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((m, index) => {
          if (index === 0) {
            m.removeAttribute("media");
            m.content = bg;
          } else {
            m.remove();
          }
        });
      if (!document.querySelector('meta[name="theme-color"]')) {
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = bg;
        document.head.appendChild(meta);
      }
    });

    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [state.theme, state.palette]);


  // ---- cloud sync: publish my own real stats so friends can see them ----
  const userId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  const readyRef = useRef(false);
  latest.current = state;

  const push = useCallback(async () => {
    const id = userId.current;
    if (!id || !readyRef.current) return;
    const s = latest.current;
    const overall = overallStats(s.subjects);
    const syllabus = syllabusStats(s.subjects);
    const questions = overallQuestions(s.subjects);
    const visible = s.subjects.filter((x) => !x.hidden);
    const todayGoals = s.plans[todayKey()] ?? [];
    const minutes = todayGoals.reduce((acc, g) => {
      if (!g.done || !g.start || !g.end) return acc;
      const [sh, sm] = g.start.split(":").map(Number);
      const [eh, em] = g.end.split(":").map(Number);
      const diff = (eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0));
      return acc + Math.max(0, diff);
    }, 0);
    const sharedData = {
      revisionIntervals: s.revisionIntervals,
      history: s.history,
      plans: s.plans,
      dailyGoal: s.dailyGoal,
      subjects: visible,
    };
    await supabase.from("study_snapshots").upsert({
      user_id: id,
      percent: syllabus.total ? syllabus.percent : overall.percent,
      completed: overall.completed,
      total: overall.total,
      streak: streakFrom(s.history),
      done_today: s.history[todayKey()] ?? 0,
      daily_goal: s.dailyGoal,
      chapters_done: syllabus.completed,
      chapters_total: syllabus.total,
      questions_solved: questions.solved,
      questions_total: questions.total,
      study_minutes: minutes,
      goals_done: todayGoals.filter((g) => g.done).length,
      goals_total: todayGoals.length,
      goals: todayGoals.map((g) => ({
        text: g.text,
        done: g.done,
        start: g.start ?? null,
        end: g.end ?? null,
      })),
      subjects: visible.map((x) => ({
        name: x.name,
        percent: subjectStats(x).percent,
        chapters: x.chapters.filter((c) => !c.archived).length,
      })),
      current_chapters: activeChapters(visible, s.currentChapterId).map((a) => ({
        subject: a.subject.name,
        chapter: a.chapter.name,
        percent: a.percent,
      })),
      shared_data: sharedData,
      updated_at: new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      userId.current = data.session?.user.id ?? null;
      if (userId.current) void push();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      userId.current = session?.user.id ?? null;
      if (userId.current) void push();
    });
    return () => sub.subscription.unsubscribe();
  }, [push]);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  useEffect(() => {
    if (!ready || !userId.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void push(), 900);
  }, [state, ready, push]);

  const update = useCallback((fn: (draft: StudyState) => void) => {
    setState((prev) => {
      const draft = clone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const findSubject = (draft: StudyState, id: string) => draft.subjects.find((s) => s.id === id);
  const findChapter = (draft: StudyState, sid: string, cid: string) =>
    findSubject(draft, sid)?.chapters.find((c) => c.id === cid);

  const api = useMemo<Ctx>(() => {
    const reorder = <T extends { id: string }>(list: T[], fromId: string, toId: string) => {
      const from = list.findIndex((i) => i.id === fromId);
      const to = list.findIndex((i) => i.id === toId);
      if (from < 0 || to < 0 || from === to) return;
      const [item] = list.splice(from, 1);
      if (item) list.splice(to, 0, item);
    };
    const instantiate = (t: ResourceTemplate): Resource => ({
      id: uid(),
      name: t.name,
      total: t.total,
      completed: 0,
      items: Array.from({ length: t.total }, (_, index) => ({
        id: uid(),
        position: index + 1,
        done: false,
      })),
      ...(t.questions && t.questions > 0 ? { questions: t.questions, questionsDone: 0 } : {}),
    });
    const newChapter = (name: string, subject?: Subject): Chapter => ({
      id: uid(),
      name,
      archived: false,
      done: false,
      resources: (subject?.commonResources ?? []).map(instantiate),
    });

    return {
      state,
      ready,
      update,
      addSubject: (name) =>
        update((d) => {
          const subject: Subject = {
            id: uid(),
            name,
            accent: (d.subjects.length % 5) + 1,
            hidden: false,
            chapters: [],
            commonResources: [],
          };
          d.subjects.push(subject);
        }),
      renameSubject: (id, name) =>
        update((d) => {
          const s = findSubject(d, id);
          if (s) s.name = name;
        }),
      deleteSubject: (id) =>
        update((d) => {
          d.subjects = d.subjects.filter((s) => s.id !== id);
        }),
      toggleSubjectHidden: (id) =>
        update((d) => {
          const s = findSubject(d, id);
          if (s) s.hidden = !s.hidden;
        }),
      moveSubject: (id, dir) =>
        update((d) => {
          const i = d.subjects.findIndex((s) => s.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= d.subjects.length) return;
          const a = d.subjects[i]!;
          const b = d.subjects[j]!;
          d.subjects[i] = b;
          d.subjects[j] = a;
        }),
      addChapter: (subjectId, name) =>
        update((d) => {
          const s = findSubject(d, subjectId);
          if (!s) return;
          const chapter = newChapter(name, s);
          s.chapters.push(chapter);
          if (!d.currentChapterId) d.currentChapterId = chapter.id;
        }),
      addChapters: (subjectId, names) =>
        update((d) => {
          const s = findSubject(d, subjectId);
          if (!s) return;
          for (const n of names) s.chapters.push(newChapter(n, s));
        }),
      renameChapter: (subjectId, id, name) =>
        update((d) => {
          const c = findChapter(d, subjectId, id);
          if (c) c.name = name;
        }),
      deleteChapter: (subjectId, id) =>
        update((d) => {
          const s = findSubject(d, subjectId);
          if (!s) return;
          s.chapters = s.chapters.filter((c) => c.id !== id);
          if (d.currentChapterId === id) d.currentChapterId = null;
        }),
      toggleArchive: (subjectId, id) =>
        update((d) => {
          const c = findChapter(d, subjectId, id);
          if (c) c.archived = !c.archived;
        }),
      toggleChapterDone: (subjectId, id) =>
        update((d) => {
          const c = findChapter(d, subjectId, id);
          if (!c) return;
          const wasComplete = c.done || chapterPercent(c) === 100;
          c.done = !wasComplete;
          if (c.done) {
            const date = c.completionDate ?? todayKey();
            c.completionDate = date;
            c.revisions = makeRevisions(date, d.revisionIntervals);
            for (const r of c.resources) {
              r.items = (r.items ?? []).map((item) => ({ ...item, done: true, completedAt: date }));
              r.completed = r.total;
            }
          } else {
            c.completionDate = undefined;
            c.revisions = [];
          }
        }),
      resetChapter: (subjectId, id) =>
        update((d) => {
          const c = findChapter(d, subjectId, id);
          if (!c) return;
          c.done = false;
          c.completionDate = undefined;
          c.revisions = [];
          c.resources.forEach((r) => {
            r.completed = 0;
            r.items = (r.items ?? []).map((item) => ({ ...item, done: false, completedAt: undefined }));
          });
        }),
      setChapterCompletionDate: (subjectId, id, date) =>
        update((d) => {
          const c = findChapter(d, subjectId, id);
          if (!c || !date) return;
          c.completionDate = date;
          c.done = true;
          c.revisions = makeRevisions(date, d.revisionIntervals);
        }),
      completeRevision: (subjectId, chapterId, revisionId) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          const revision = c?.revisions?.find((item) => item.id === revisionId);
          if (!revision) return;
          revision.completed = !revision.completed;
          revision.completedAt = revision.completed ? todayKey() : undefined;
        }),
      setRevisionIntervals: (intervals) =>
        update((d) => {
          const next = intervals
            .map((value) => Math.round(value))
            .filter((value) => Number.isFinite(value) && value > 0);
          d.revisionIntervals = next.length ? [...new Set(next)] : DEFAULT_REVISION_INTERVALS;
          d.subjects.forEach((s) =>
            s.chapters.forEach((c) => {
              if (c.completionDate) c.revisions = makeRevisions(c.completionDate, d.revisionIntervals);
            }),
          );
        }),
      reorderChapter: (subjectId, fromId, toId) =>
        update((d) => {
          const s = findSubject(d, subjectId);
          if (s) reorder(s.chapters, fromId, toId);
        }),
      setCurrentChapter: (id) =>
        update((d) => {
          d.currentChapterId = id;
        }),
      addResource: (subjectId, chapterId, name, total, questions) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          if (c)
            c.resources.push({
              id: uid(),
              name,
              total,
              completed: 0,
              items: Array.from({ length: total }, (_, index) => ({
                id: uid(),
                position: index + 1,
                done: false,
              })),
              ...(questions && questions > 0 ? { questions, questionsDone: 0 } : {}),
            });
          if (!d.resourcePresets.includes(name)) d.resourcePresets.push(name);
        }),
      updateResource: (subjectId, chapterId, resourceId, patch) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          const r = c?.resources.find((x) => x.id === resourceId);
          if (!r) return;
          const wantsCompleted = patch.completed !== undefined;
          Object.assign(r, patch);
          r.total = Math.max(0, Math.round(r.total));
          const items = r.items ?? [];
          r.items = Array.from({ length: r.total }, (_, index) => items[index] ?? ({
            id: uid(),
            position: index + 1,
            done: false,
          } satisfies ResourceItem));
          r.items = r.items.map((item, index) => ({ ...item, position: index + 1 }));
          if (wantsCompleted) {
            // Manual count entry: keep the first N items marked as done.
            const target = Math.min(Math.max(0, Math.round(patch.completed ?? 0)), r.total);
            r.items = r.items.map((item, index) => {
              const done = index < target;
              return {
                ...item,
                done,
                ...(done ? { completedAt: item.completedAt ?? todayKey() } : { completedAt: undefined }),
              };
            });
          }
          r.completed = (r.items ?? []).filter((item) => item.done).length;
          if (r.questions !== undefined) {
            r.questions = Math.max(0, Math.round(r.questions));
            r.questionsDone = Math.min(
              Math.max(0, Math.round(r.questionsDone ?? 0)),
              r.questions,
            );
          }
        }),
      setResourceItemsDone: (subjectId, chapterId, resourceId, done) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          const r = c?.resources.find((x) => x.id === resourceId);
          if (!r) return;
          const items = r.items ?? [];
          const newlyDone = done ? items.filter((i) => !i.done).length : 0;
          r.items = items.map((item) => ({
            ...item,
            done,
            ...(done ? { completedAt: item.completedAt ?? todayKey() } : { completedAt: undefined }),
          }));
          r.completed = (r.items ?? []).filter((item) => item.done).length;
          if (newlyDone > 0) {
            const k = todayKey();
            d.history[k] = (d.history[k] ?? 0) + newlyDone;
          }
          d.currentChapterId = chapterId;
        }),

      deleteResource: (subjectId, chapterId, resourceId) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          if (c) c.resources = c.resources.filter((r) => r.id !== resourceId);
        }),
      reorderResource: (subjectId, chapterId, fromId, toId) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          if (c) reorder(c.resources, fromId, toId);
        }),
      addCommonResource: (subjectId, name, total, questions) =>
        update((d) => {
          const s = findSubject(d, subjectId);
          if (!s) return;
          s.commonResources = s.commonResources ?? [];
          const template: ResourceTemplate = {
            id: uid(),
            name,
            total,
            ...(questions && questions > 0 ? { questions } : {}),
          };
          s.commonResources.push(template);
          for (const c of s.chapters) {
            if (!c.resources.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
              c.resources.push(instantiate(template));
            }
          }
          if (!d.resourcePresets.includes(name)) d.resourcePresets.push(name);
        }),
      deleteCommonResource: (subjectId, templateId) =>
        update((d) => {
          const s = findSubject(d, subjectId);
          if (!s) return;
          const t = (s.commonResources ?? []).find((x) => x.id === templateId);
          s.commonResources = (s.commonResources ?? []).filter((x) => x.id !== templateId);
          if (!t) return;
          for (const c of s.chapters) {
            c.resources = c.resources.filter(
              (r) => r.name.toLowerCase() !== t.name.toLowerCase() || r.completed > 0,
            );
          }
        }),
      applyCommonResources: (subjectId) =>
        update((d) => {
          const s = findSubject(d, subjectId);
          if (!s) return;
          for (const t of s.commonResources ?? []) {
            for (const c of s.chapters) {
              if (!c.resources.some((r) => r.name.toLowerCase() === t.name.toLowerCase())) {
                c.resources.push(instantiate(t));
              }
            }
          }
        }),
      bumpProgress: (subjectId, chapterId, resourceId, delta) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          const r = c?.resources.find((x) => x.id === resourceId);
          if (!r) return;
           r.items = r.items ?? [];
           const target = r.items.find((item) => (delta > 0 ? !item.done : item.done));
           if (!target) return;
           target.done = delta > 0;
           target.completedAt = delta > 0 ? todayKey() : undefined;
           const applied = delta > 0 ? 1 : -1;
           r.completed = (r.items ?? []).filter((item) => item.done).length;
          if (applied > 0) {
            const k = todayKey();
            d.history[k] = (d.history[k] ?? 0) + applied;
          }
          d.currentChapterId = chapterId;
        }),
      toggleResourceItem: (subjectId, chapterId, resourceId, itemId) =>
        update((d) => {
          const c = findChapter(d, subjectId, chapterId);
          const r = c?.resources.find((x) => x.id === resourceId);
          const item = r?.items?.find((x) => x.id === itemId);
          if (!r || !item) return;
          item.done = !item.done;
          item.completedAt = item.done ? todayKey() : undefined;
          r.completed = r.items?.filter((x) => x.done).length ?? 0;
          if (item.done) {
            const k = todayKey();
            d.history[k] = (d.history[k] ?? 0) + 1;
          }
          d.currentChapterId = chapterId;
        }),
      addGoal: (text, start, end) =>
        update((d) => {
          const k = todayKey();
          const goal: Goal = { id: uid(), text, done: false };
          if (start) goal.start = start;
          if (end) goal.end = end;
          d.plans[k] = [...(d.plans[k] ?? []), goal].sort((a, b) =>
            (a.start ?? "zz").localeCompare(b.start ?? "zz"),
          );
        }),
      toggleGoal: (id) =>
        update((d) => {
          const k = todayKey();
          const g = d.plans[k]?.find((x) => x.id === id);
          if (g) g.done = !g.done;
        }),
      deleteGoal: (id) =>
        update((d) => {
          const k = todayKey();
          d.plans[k] = (d.plans[k] ?? []).filter((x) => x.id !== id);
        }),
      setTheme: (theme) =>
        update((d) => {
          d.theme = theme;
        }),
      setPalette: (palette) =>
        update((d) => {
          d.palette = palette;
        }),
      setDailyGoal: (n) =>
        update((d) => {
          d.dailyGoal = Math.max(1, Math.round(n));
        }),
      clearAllData: () => {
        setState((prev) => ({ ...emptyState(), theme: prev.theme, palette: prev.palette }));
      },
    };
  }, [state, ready, update]);

  return (
    <StudyContext.Provider value={api}>
      {ready ? (
        children
      ) : (
        <div className="grid min-h-screen place-items-center">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand text-lg font-bold text-primary-foreground">
              P
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Loading Photon…</p>
          </div>
        </div>
      )}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used inside StudyProvider");
  return ctx;
}
