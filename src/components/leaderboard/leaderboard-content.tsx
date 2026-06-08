"use client";

import { useState } from "react";
import type { LeaderboardResponse, OverviewResponse } from "@/lib/types";
import { LeaderboardPodium } from "./leaderboard-table";
import { cn } from "@/lib/utils";

type ViewMode = "matchday" | "season";

interface Props {
  initialData: LeaderboardResponse;
  overview: OverviewResponse | null;
}

export function LeaderboardContent({ initialData, overview }: Props) {
  const [view, setView] = useState<ViewMode>("matchday");

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {initialData.title}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button
              className={cn(
                "px-4 py-2 text-xs font-bold transition-all",
                view === "matchday"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setView("matchday")}
            >
              MD
            </button>
            <button
              className={cn(
                "px-4 py-2 text-xs font-bold transition-all",
                view === "season"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setView("season")}
            >
              Season
            </button>
          </div>
        </div>
      </div>

      {/* Podium + List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <LeaderboardPodium rankings={initialData.rankings} overview={view === "season" ? overview : null} />
      </div>
    </div>
  );
}
