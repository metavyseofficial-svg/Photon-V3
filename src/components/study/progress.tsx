import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Returns a counter that increments whenever `value` moves forward, plus the
 * previous value. Used to replay one-shot micro-interactions on progress gains.
 */
export function useForwardBeat(value: number) {
  const previous = useRef(value);
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (value > previous.current) setBeat((b) => b + 1);
    previous.current = value;
  }, [value]);
  return beat;
}

/** Eases a number towards `value` so percentages tick up instead of snapping. */
function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (value - from) * eased);
      setDisplay(next);
      fromRef.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return display;
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 11,
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const beat = useForwardBeat(pct);
  const shown = useCountUp(pct);

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <div
        key={beat}
        className={cn("grid place-items-center", beat > 0 && "animate-ring-pulse")}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={cn(
              "transition-[stroke] duration-500",
              pct === 100 ? "stroke-success" : "stroke-primary",
            )}
            strokeDasharray={c}
            strokeDashoffset={c - (pct / 100) * c}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="font-display text-2xl font-semibold tabular-nums">
            {label ?? `${shown}%`}
          </div>
          {sublabel ? (
            <div className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
              {sublabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "success" | "warning";
}) {
  const pct = Math.min(100, Math.max(0, value));
  const beat = useForwardBeat(pct);
  const toneClass =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-brand";

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted/80 shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)]",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full", toneClass)}
        style={{ width: `${pct}%`, transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)" }}
      />
      {beat > 0 ? <span key={beat} className="progress-sheen" aria-hidden="true" /> : null}
    </div>
  );
}
