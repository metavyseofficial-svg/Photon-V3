export type Resource = {
  id: string;
  name: string;
  total: number;
  completed: number;
  items?: ResourceItem[];
  /** Optional: total number of questions in this resource. */
  questions?: number;
  /** Optional: number of questions solved so far. */
  questionsDone?: number;
};

export type ResourceItem = {
  id: string;
  position: number;
  done: boolean;
  completedAt?: string | undefined;
};

export type Revision = {
  id: string;
  interval: number;
  dueDate: string;
  completed: boolean;
  completedAt?: string | undefined;
};

export type QuestionStats = { solved: number; total: number; percent: number };


export type Chapter = {
  id: string;
  name: string;
  archived: boolean;
  done: boolean; // chapter-wise completion (used when no resources are tracked)
  resources: Resource[];
  completionDate?: string | undefined;
  revisions?: Revision[];
};

/** A resource defined once for a subject and mirrored into every chapter. */
export type ResourceTemplate = {
  id: string;
  name: string;
  total: number;
  questions?: number;
};

export type Subject = {
  id: string;
  name: string;
  accent: number; // 1..5 -> chart tokens
  hidden: boolean; // hidden from friends
  chapters: Chapter[];
  /** Common resources available in every chapter of this subject. */
  commonResources?: ResourceTemplate[];
};

export type Goal = {
  id: string;
  text: string;
  start?: string; // "09:00"
  end?: string; // "11:00"
  done: boolean;
};

export type StudyState = {
  subjects: Subject[];
  currentChapterId: string | null;
  dailyGoal: number;
  history: Record<string, number>; // yyyy-mm-dd -> items completed
  plans: Record<string, Goal[]>; // yyyy-mm-dd -> today's goals
  friendCode: string;
  friends: { code: string; name: string }[];
  theme: "light" | "dark";
  palette: PaletteId;
  resourcePresets: string[];
  revisionIntervals: number[];
};

export type PaletteId =
  | "photon"
  | "aurora"
  | "ember"
  | "verdant"
  | "blossom"
  | "graphite";

export type PaletteMeta = {
  id: PaletteId;
  name: string;
  description: string;
  swatch: [string, string, string];
};

export const PALETTES: PaletteMeta[] = [
  {
    id: "photon",
    name: "Photon",
    description: "Cool cyan and deep slate",
    swatch: ["#2f9bbd", "#5f7fd8", "#1b2130"],
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Soft violet with indigo depth",
    swatch: ["#8a7bf0", "#c07de2", "#1d1a2e"],
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm amber and burnished copper",
    swatch: ["#d98a3c", "#d9603f", "#241c18"],
  },
  {
    id: "verdant",
    name: "Verdant",
    description: "Calm emerald and moss",
    swatch: ["#3fa981", "#79b455", "#16221d"],
  },
  {
    id: "blossom",
    name: "Blossom",
    description: "Muted rose with plum shadows",
    swatch: ["#d2699a", "#a56ad0", "#241823"],
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Quiet monochrome, zero noise",
    swatch: ["#7d8794", "#a9b2bd", "#1a1c1f"],
  },
];

export type Stats = {
  total: number;
  completed: number;
  remaining: number;
  percent: number;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const RESOURCE_PRESETS = [
  "Lectures",
  "DPP",
  "PYQ",
  "Modules",
  "Notes",
  "Books",
  "Revision",
  "Tests",
];

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_REVISION_INTERVALS = [1, 3, 7, 15, 30, 60, 90, 120, 150, 180];

export function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function makeRevisions(completionDate: string, intervals: number[]): Revision[] {
  return intervals
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .map((interval, index) => ({
      id: `${completionDate}-${interval}-${index}-${uid()}`,
      interval,
      dueDate: addDays(completionDate, interval),
      completed: false,
    }));
}

export function sumResources(resources: Resource[]): Stats {
  const total = resources.reduce((a, r) => a + r.total, 0);
  const completed = resources.reduce((a, r) => a + Math.min(r.completed, r.total), 0);
  return {
    total,
    completed,
    remaining: Math.max(total - completed, 0),
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function chapterStats(chapter: Chapter): Stats {
  return sumResources(chapter.resources);
}

/** Percent for a chapter: resource-driven when resources exist, else the manual done flag. */
export function chapterPercent(chapter: Chapter): number {
  if (chapter.resources.length === 0) return chapter.done ? 100 : 0;
  return chapterStats(chapter).percent;
}

export function isChapterComplete(chapter: Chapter): boolean {
  return chapter.done || chapterPercent(chapter) === 100;
}

/** A chapter counts as "currently studying" when it's started but unfinished. */
export function isChapterActive(chapter: Chapter): boolean {
  if (chapter.archived || isChapterComplete(chapter)) return false;
  return chapterPercent(chapter) > 0;
}

/** Any chapter still to be finished (not archived, not complete). */
export function isChapterPending(chapter: Chapter): boolean {
  return !chapter.archived && !isChapterComplete(chapter);
}


/** Optional question tracking rolled up over a list of resources. */
export function questionStats(resources: Resource[]): QuestionStats {
  const total = resources.reduce((a, r) => a + (r.questions ?? 0), 0);
  const solved = resources.reduce(
    (a, r) => a + Math.min(r.questionsDone ?? 0, r.questions ?? Infinity),
    0,
  );
  return { solved, total, percent: total === 0 ? 0 : Math.round((solved / total) * 100) };
}

export function chapterQuestions(chapter: Chapter): QuestionStats {
  return questionStats(chapter.resources);
}

export function subjectQuestions(subject: Subject): QuestionStats {
  return questionStats(subject.chapters.flatMap((c) => c.resources));
}

export function overallQuestions(subjects: Subject[]): QuestionStats {
  return questionStats(subjects.flatMap((s) => s.chapters.flatMap((c) => c.resources)));
}

export function subjectStats(subject: Subject): Stats {
  return sumResources(subject.chapters.flatMap((c) => c.resources));
}


export function overallStats(subjects: Subject[]): Stats {
  return sumResources(subjects.flatMap((s) => s.chapters.flatMap((c) => c.resources)));
}

/** Chapter-wise syllabus completion across all subjects. */
export function syllabusStats(subjects: Subject[]): Stats {
  const chapters = subjects.flatMap((s) => s.chapters).filter((c) => !c.archived);
  const completed = chapters.filter(isChapterComplete).length;
  const total = chapters.length;
  return {
    total,
    completed,
    remaining: Math.max(total - completed, 0),
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function subjectSyllabusStats(subject: Subject): Stats {
  return syllabusStats([subject]);
}

/**
 * Chapters you are currently working through, across every subject.
 * Started (or focused) chapters rank first, then untouched pending chapters,
 * so this list is never empty while any chapter is still unfinished.
 */
export function activeChapters(subjects: Subject[], currentChapterId?: string | null) {
  return subjects
    .flatMap((s) =>
      s.chapters.filter(isChapterPending).map((c) => {
        const percent = chapterPercent(c);
        const focused = currentChapterId === c.id;
        return {
          subject: s,
          chapter: c,
          percent,
          focused,
          started: focused || percent > 0,
        };
      }),
    )
    .sort((a, b) => {
      if (a.focused !== b.focused) return a.focused ? -1 : 1;
      if (a.started !== b.started) return a.started ? -1 : 1;
      return b.percent - a.percent;
    });
}


export function streakFrom(history: Record<string, number>): number {
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if ((history[key] ?? 0) > 0) {
      streak += 1;
    } else if (streak > 0 || key !== todayKey()) {
      break;
    }
    d.setDate(d.getDate() - 1);
    if (streak > 400) break;
  }
  return streak;
}

export function formatTimeBlock(start?: string, end?: string): string | null {
  const fmt = (t?: string) => {
    if (!t) return null;
    const [h, m] = t.split(":");
    const hour = Number(h);
    if (Number.isNaN(hour)) return null;
    const suffix = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:${(m ?? "00").padStart(2, "0")} ${suffix}`;
  };
  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `${a} – ${b}`;
  return a ?? b ?? null;
}

export function emptyState(): StudyState {
  return {
    subjects: [],
    currentChapterId: null,
    dailyGoal: 10,
    history: {},
    plans: {},
    friendCode: String(Math.floor(100000 + Math.random() * 900000)),
    friends: [],
    theme: "dark",
    palette: "photon",
    resourcePresets: RESOURCE_PRESETS,
    revisionIntervals: DEFAULT_REVISION_INTERVALS,
  };
}

const mkResources = (spec: [string, number, number][]): Resource[] =>
  spec.map(([name, total, completed]) => ({
    id: uid(),
    name,
    total,
    completed,
    items: Array.from({ length: total }, (_, index) => ({
      id: uid(),
      position: index + 1,
      done: index < completed,
      ...(index < completed ? { completedAt: todayKey() } : {}),
    })),
  }));

const ch = (name: string, spec: [string, number, number][], archived = false): Chapter => ({
  id: uid(),
  name,
  archived,
  done: false,
  resources: mkResources(spec),
});

export function defaultState(): StudyState {
  const physicsCh1 = ch("Kinematics", [
    ["Lectures", 24, 18],
    ["DPP", 12, 9],
    ["PYQ", 40, 22],
  ]);

  return {
    ...emptyState(),
    subjects: [
      {
        id: uid(),
        name: "Physics",
        accent: 1,
        hidden: false,
        chapters: [
          physicsCh1,
          ch("Laws of Motion", [
            ["Lectures", 20, 6],
            ["DPP", 10, 2],
          ]),
          ch("Units & Measurement", [["Lectures", 8, 8]]),
        ],
      },
      {
        id: uid(),
        name: "Chemistry",
        accent: 2,
        hidden: false,
        chapters: [
          ch("Mole Concept", [
            ["Lectures", 16, 11],
            ["PYQ", 30, 12],
          ]),
          ch("Chemical Bonding", [["Lectures", 22, 3]]),
        ],
      },
      {
        id: uid(),
        name: "Biology",
        accent: 4,
        hidden: false,
        chapters: [
          ch("Cell Structure", [
            ["Lectures", 18, 14],
            ["Tests", 6, 3],
          ]),
        ],
      },
    ],
    currentChapterId: physicsCh1.id,
    dailyGoal: 12,
  };
}

/** Per-resource stats derived from individual items (falls back to counters). */
export function resourceStats(resource: Resource): Stats {
  const items = resource.items ?? [];
  const total = items.length || resource.total;
  const completed = items.length
    ? items.filter((i) => i.done).length
    : Math.min(resource.completed, resource.total);
  return {
    total,
    completed,
    remaining: Math.max(total - completed, 0),
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

/** Items of a resource, always ordered and normalised for display. */
export function resourceItems(resource: Resource): ResourceItem[] {
  const items = resource.items ?? [];
  if (items.length) return [...items].sort((a, b) => a.position - b.position);
  return Array.from({ length: resource.total }, (_, index) => ({
    id: `${resource.id}-virtual-${index + 1}`,
    position: index + 1,
    done: index < resource.completed,
  }));
}
