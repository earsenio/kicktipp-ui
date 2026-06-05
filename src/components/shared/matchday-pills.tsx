"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MatchdayPillsProps {
  current: number;
  max?: number;
  onChange: (matchday: number) => void;
}

export function MatchdayPills({ current, max = 34, onChange }: MatchdayPillsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const pill = scrollRef.current.children[current - 1] as HTMLElement | undefined;
    if (pill) {
      pill.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [current]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 px-4 py-1.5 pb-2.5 overflow-x-auto scrollbar-hide"
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const isActive = n === current;
        return (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all border",
              isActive
                ? "bg-primary text-white border-transparent"
                : "bg-white/[0.04] text-white/40 border-white/[0.06] hover:text-white/60"
            )}
          >
            MD {n}
          </button>
        );
      })}
    </div>
  );
}
