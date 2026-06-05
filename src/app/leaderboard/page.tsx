"use client";

import type { LeaderboardResponse, OverviewResponse } from "@/lib/types";
import { LeaderboardContent } from "@/components/leaderboard/leaderboard-content";
import { LeaderboardSkeleton } from "@/components/shared/loading-skeleton";
import { useKicktipp } from "@/hooks/use-kicktipp";

export default function LeaderboardPage() {
  const { data: leaderboard, loading, error } = useKicktipp<LeaderboardResponse>({
    tool: "get_leaderboard",
  });
  const { data: overview } = useKicktipp<OverviewResponse>({
    tool: "get_overview",
  });

  if (loading) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <LeaderboardSkeleton rows={10} />
      </div>
    );
  }

  if (error || !leaderboard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load leaderboard</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <LeaderboardContent
      initialData={leaderboard}
      overview={overview}
    />
  );
}
