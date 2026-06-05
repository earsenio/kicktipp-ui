"use client";

import { useState, useEffect } from "react";
import { useKicktipp } from "@/hooks/use-kicktipp";
import type { OverviewResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FormIndicator() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const { data } = useKicktipp<OverviewResponse>({
    tool: "get_overview",
    options: { skip: !ready, refreshInterval: 300_000 },
  });

  if (!data) return null;

  const currentPlayer = data.players.find((p) => p.isCurrentPlayer);
  if (!currentPlayer) return null;

  const entries = Object.entries(currentPlayer.matchdays)
    .map(([k, v]) => ({ md: Number(k), pts: Number(v) || 0 }))
    .filter((e) => e.pts > 0)
    .sort((a, b) => a.md - b.md);

  if (entries.length === 0) return null;

  const allPoints = entries.map((e) => e.pts);
  const avg = allPoints.reduce((a, b) => a + b, 0) / allPoints.length;
  const last5 = entries.slice(-5);

  return (
    <div className="flex items-center gap-1" title="Last 5 matchday form">
      {last5.map((e) => (
        <div
          key={e.md}
          className={cn(
            "w-2 h-2 rounded-full",
            e.pts >= avg * 1.2
              ? "bg-accent-green"
              : e.pts >= avg * 0.8
                ? "bg-amber-500"
                : "bg-accent-red"
          )}
          title={`MD${e.md}: ${e.pts} pts`}
        />
      ))}
    </div>
  );
}
