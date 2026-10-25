"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Villager";

/** Countdown as the clock tower: time runs out at midnight and "the spell breaks". `deadline` is local clock time (useRoom). */
export function ClockTower({
  deadline,
  totalSeconds,
  size = "md",
  caption = true,
  className = "",
}: {
  deadline: number | null;
  totalSeconds: number;
  size?: "sm" | "md" | "lg";
  caption?: boolean;
  className?: string;
}) {
  // null until mounted, so the server render and the first client render match (no hydration warning)
  const [mounted, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => {
      clearInterval(id);
    };
  }, [deadline]);
  if (deadline === null) return null;

  const now = mounted ?? deadline - totalSeconds * 1000;
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const frac = Math.min(1, Math.max(0, (deadline - now) / (totalSeconds * 1000)));
  const urgent = left <= 5;
  const s = {
    sm: { tower: "h-12 w-9", num: "text-[1.6rem]" },
    md: { tower: "h-16 w-12", num: "text-[2.2rem]" },
    lg: { tower: "h-24 w-[4.5rem]", num: "text-[3.2rem]" },
  }[size];
  return (
    <div role="timer" aria-label={`${String(left)} seconds left`} className={`flex items-center gap-3 ${className}`}>
      <span className="relative">
        <Icon id="clock-tower" className={`${s.tower} ${urgent ? "animate-[bob_0.6s_ease-in-out_infinite]" : ""}`} />
        {/* a thin gold ring drains around the tower as time runs */}
        <svg viewBox="0 0 40 40" className="absolute -inset-2 size-[calc(100%+1rem)] -rotate-90" aria-hidden="true">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#dbb35e" strokeOpacity=".25" strokeWidth="2" />
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke={urgent ? "#963248" : "#dbb35e"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${String(frac * 113.1)} 113.1`}
            className="transition-[stroke-dasharray] duration-200"
          />
        </svg>
      </span>
      <span className="leading-none">
        <span className={`block font-display font-bold tabular-nums ${s.num} ${urgent ? "text-rasp-deep" : "text-ink"}`}>
          0:{String(left).padStart(2, "0")}
        </span>
        {caption && <span className="voice mt-1 block text-[0.85rem] text-ink-soft">left before the spell breaks</span>}
      </span>
    </div>
  );
}
