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
      <div className="px-4 pt-3 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Leaderboard</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {initialData.title}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-[10px] overflow-hidden border border-white/[0.08]">
            <button
              className={cn(
                "px-3.5 py-1.5 text-[11px] font-semibold transition-all",
                view === "matchday"
                  ? "bg-primary text-white"
                  : "text-white/40 hover:text-white/60"
              )}
              onClick={() => setView("matchday")}
            >
              MD
            </button>
            <button
              className={cn(
                "px-3.5 py-1.5 text-[11px] font-semibold transition-all",
                view === "season"
                  ? "bg-primary text-white"
                  : "text-white/40 hover:text-white/60"
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
