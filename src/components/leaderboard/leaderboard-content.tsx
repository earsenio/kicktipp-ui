"use client";

import { useState } from "react";
import type { LeaderboardResponse, OverviewResponse } from "@/lib/types";
import { LeaderboardPodium } from "./leaderboard-table";
import { MatchdayPills } from "@/components/shared/matchday-pills";
import { useKicktipp } from "@/hooks/use-kicktipp";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "matchday" | "season";

interface Props {
  initialData: LeaderboardResponse;
  overview: OverviewResponse | null;
}

export function LeaderboardContent({ initialData, overview }: Props) {
  const [matchday, setMatchday] = useState(1);
  const [view, setView] = useState<ViewMode>("matchday");

  const { data: fetched, loading } = useKicktipp<LeaderboardResponse>({
    tool: "get_leaderboard",
    args: { matchday },
    options: { skip: matchday === 1 },
  });

  const data = matchday === 1 ? initialData : fetched ?? initialData;

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Header */}
      <div className="px-4 pt-3 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Leaderboard</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {data.title || `Matchday ${matchday}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40 mr-2" />}
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

      {/* Matchday pills */}
      <MatchdayPills current={matchday} onChange={setMatchday} />

      {/* Podium + List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <LeaderboardPodium rankings={data.rankings} overview={view === "season" ? overview : null} />
      </div>
    </div>
  );
}
