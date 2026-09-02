import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Check, Download, Minus, Moon, Plus, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Card, SectionTitle } from "@/components/study/app-shell";
import { InstallApp } from "@/components/study/install-app";
import { useStudy } from "@/lib/study/store";
import { PALETTES } from "@/lib/study/types";


export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Photon" },
      {
        name: "description",
        content:
          "Set your daily target, switch appearance, export your study data or clear everything and start fresh.",
      },
      { property: "og:title", content: "Settings — Photon" },
      { property: "og:description", content: "Daily targets, appearance and data controls." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, setDailyGoal, setTheme, setPalette, clearAllData } = useStudy();
  const activePalette = state.palette ?? "photon";
  const [confirming, setConfirming] = useState(false);

  return (
    <AppShell>
      <div className="animate-rise space-y-5">
        <SectionTitle eyebrow="Preferences" title="Settings" />

        <InstallApp />



        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Daily target
          </p>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              aria-label="Decrease target"
              onClick={() => setDailyGoal(state.dailyGoal - 1)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border transition-colors hover:bg-secondary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <p className="min-w-16 text-center font-display text-3xl font-semibold tabular-nums">
              {state.dailyGoal}
            </p>
            <button
              type="button"
              aria-label="Increase target"
              onClick={() => setDailyGoal(state.dailyGoal + 1)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border transition-colors hover:bg-secondary"
            >
              <Plus className="h-4 w-4" />
            </button>
            <p className="text-sm text-muted-foreground">items per day</p>
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Appearance
          </p>
          <div className="mt-4 flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition-colors ${
                  state.theme === t
                    ? "border-primary/40 bg-primary/10"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {t === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {t}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Theme
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Every palette works in both light and dark mode.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {PALETTES.map((p) => {
              const active = activePalette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.id)}
                  aria-pressed={active}
                  className={`lift-hover flex flex-col gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    active
                      ? "border-primary/50 bg-primary/10"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {p.swatch.map((c) => (
                      <span
                        key={c}
                        className="h-6 w-6 rounded-full border border-glass-border"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {active ? (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    ) : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{p.name}</span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">
                      {p.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Your data
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(state, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "preparation-stat-backup.json";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Backup downloaded");
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Download className="h-4 w-4" /> Export data
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" /> Clear data
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Clearing removes every subject, chapter, goal and streak on this device.
          </p>
        </Card>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-md">
          <div className="animate-pop glass-chrome w-full max-w-sm rounded-[28px] p-6 shadow-[var(--shadow-lift)]">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-destructive/15 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold">Clear all data?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This permanently deletes your subjects, chapters, today's goals, history and streak.
              This can't be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllData();
                  setConfirming(false);
                  toast.success("All data cleared");
                }}
                className="flex-1 rounded-2xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
              >
                Clear data
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
