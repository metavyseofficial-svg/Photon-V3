import { Link } from "@tanstack/react-router";
import { Home, Layers, Users, Settings, Moon, Sun, Flame, BookOpen, User2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStudy } from "@/lib/study/store";
import { useAuth } from "@/lib/auth";
import { streakFrom } from "@/lib/study/types";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/syllabus", label: "Syllabus", icon: BookOpen },
  { to: "/subjects", label: "Subjects", icon: Layers },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { state, setTheme } = useStudy();
  const { user } = useAuth();
  const streak = streakFrom(state.history);

  // Replay the flame animation only when the streak actually grows.
  const previousStreak = useRef(streak);
  const [streakBeat, setStreakBeat] = useState(0);
  useEffect(() => {
    if (streak > previousStreak.current) setStreakBeat((b) => b + 1);
    previousStreak.current = streak;
  }, [streak]);

  return (
    <div className="screen-fill flex w-full min-w-0 flex-col overflow-x-clip">
      {/*
        No border and a masked glass veil behind the safe-area strip so the native
        status bar blends into the app surface instead of looking like a separate bar.
      */}
      <header className="safe-top sticky top-0 z-40">
        <div className="topbar-veil" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-2 px-[max(0.75rem,env(safe-area-inset-left))] py-2.5 pr-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3 sm:px-4 md:px-8">
          <Link
            to="/"
            className="glass-chrome press group flex min-w-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 lift-hover"
          >
            <img
              src="/icon-192.png"
              alt="Photon logo"
              width={192}
              height={192}
              className="h-8 w-8 shrink-0 rounded-full shadow-[0_10px_24px_-10px_var(--primary)] transition-transform duration-300 group-hover:scale-105 sm:h-9 sm:w-9"
            />
            <span className="truncate font-display text-[17px] font-semibold tracking-tight">
              Photon
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
            <nav className="glass-chrome hidden items-center gap-0.5 rounded-full p-1 lg:flex">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-all hover:text-foreground"
                  activeProps={{ className: "bg-secondary/80 text-foreground shadow-sm" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* One cohesive glass container for the three controls. */}
            <div className="glass-chrome flex items-center gap-1 rounded-full p-1 lift-hover sm:gap-1.5">
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold tabular-nums sm:px-3">
                <Flame
                  key={streakBeat}
                  className={cn("h-4 w-4 text-warning", streakBeat > 0 && "animate-flare")}
                />
                {streak}
              </div>
              <span className="h-5 w-px shrink-0 bg-glass-border" aria-hidden="true" />
              <Link
                to="/friends"
                aria-label="Account"
                className="press grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-secondary/70"
              >
                <User2 className={cn("h-4 w-4", user ? "text-primary" : "text-muted-foreground")} />
              </Link>
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() => setTheme(state.theme === "dark" ? "light" : "dark")}
                className="press grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-secondary/70"
              >
                {state.theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-[max(0.75rem,env(safe-area-inset-left))] pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4 pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 sm:pt-6 md:px-8 md:pt-10 lg:pb-10">{children}</main>

      <nav className="glass-chrome fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-[max(0.5rem,env(safe-area-inset-left))] right-[max(0.5rem,env(safe-area-inset-right))] z-40 mx-auto flex max-w-xl items-center justify-around rounded-[24px] p-1 sm:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-1.5 lg:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-0.5 py-2 text-[9px] font-medium text-muted-foreground transition-all sm:px-1 sm:text-[10px]"
            activeProps={{
              className: "bg-secondary/80 text-foreground shadow-[var(--shadow-soft)]",
            }}
            activeOptions={{ exact: item.to === "/" }}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>

    </div>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "glass-panel min-w-0 rounded-[24px] p-4 lift sm:rounded-[28px] sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}



export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 font-display text-[26px] font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
