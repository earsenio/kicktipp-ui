"use client";

import type { LeaderboardResponse } from "@/lib/types";
import { LeaderboardPodium } from "./leaderboard-table";

interface Props {
  initialData: LeaderboardResponse;
}

export function LeaderboardContent({ initialData }: Props) {
  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {initialData.title}
        </p>
      </div>

      {/* Podium + List — season-to-date standings */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <LeaderboardPodium rankings={initialData.rankings} />
      </div>
    </div>
  );
}
