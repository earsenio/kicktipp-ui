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
      className="flex gap-1.5 px-4 py-2 pb-3 overflow-x-auto scrollbar-hide border-t border-border"
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const isActive = n === current;
        return (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all border",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
            )}
          >
            MD {n}
          </button>
        );
      })}
    </div>
  );
}
