import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A tappable completion circle that pops, bursts and draws its tick instead of
 * flipping a static checkmark. Shared by goals and chapter completion.
 */
export function AnimatedCheck({
  done,
  onClick,
  label,
  className,
  tone = "success",
}: {
  done: boolean;
  onClick: () => void;
  label: string;
  className?: string;
  tone?: "success" | "primary";
}) {
  const wasDone = useRef(done);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (done && !wasDone.current) setBeat((b) => b + 1);
    wasDone.current = done;
  }, [done]);

  const filled = tone === "primary" ? "bg-brand" : "bg-success";
  const ring = tone === "primary" ? "bg-primary/35" : "bg-success/35";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={done}
      onClick={onClick}
      className={cn(
        "press relative grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-300",
        done
          ? cn("border-transparent text-primary-foreground shadow-[var(--shadow-soft)]", filled)
          : "border-border bg-surface/60 hover:border-primary",
        className,
      )}
    >
      {done && beat > 0 ? (
        <span
          key={`burst-${beat}`}
          aria-hidden="true"
          className={cn("animate-burst absolute inset-0 rounded-full", ring)}
        />
      ) : null}
      {done ? (
        <svg
          key={`tick-${beat}`}
          viewBox="0 0 24 24"
          className={cn("relative h-3 w-3", beat > 0 && "animate-check-pop")}
          fill="none"
          stroke="currentColor"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M5 13l4 4L19 7"
            strokeDasharray={22}
            className={beat > 0 ? "animate-tick" : undefined}
          />
        </svg>
      ) : null}
    </button>
  );
}
