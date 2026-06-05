"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function MatchCountdown({ time }: { time: string }) {
  const [label, setLabel] = useState<string | null>(null);
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function update() {
      const kickoff = new Date(time).getTime();
      if (isNaN(kickoff)) {
        setLabel(null);
        return;
      }

      const now = Date.now();
      const diff = kickoff - now;

      if (diff > 2 * 60 * 60 * 1000) {
        setLabel(null);
        return;
      }

      if (diff > 0) {
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        setUrgent(mins < 30);
        if (hrs > 0) {
          setLabel(`${hrs}h ${remainMins}m`);
        } else if (mins > 3) {
          setLabel(`${mins}m`);
        } else {
          setLabel(`Kicks off in ${mins}m`);
        }
      } else if (Math.abs(diff) < 3 * 60 * 60 * 1000) {
        setLabel("LIVE");
        setUrgent(false);
      } else {
        setLabel("FT");
        setUrgent(false);
      }
    }

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [time]);

  if (!label) return null;

  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
        label === "LIVE" && "bg-accent-red/15 text-accent-red",
        label === "FT" && "bg-muted text-muted-foreground",
        urgent && "bg-accent-amber/15 text-accent-amber animate-pulse",
        !urgent && label !== "LIVE" && label !== "FT" && "text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
