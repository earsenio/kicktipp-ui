"use client";

import type { LeaderboardResponse } from "@/lib/types";
import { PlayersContent } from "@/components/players/players-content";
import { LeaderboardSkeleton } from "@/components/shared/loading-skeleton";
import { useKicktipp } from "@/hooks/use-kicktipp";

export default function PlayersPage() {
  const { data: players, loading: playersLoading, error: playersError } = useKicktipp<string[]>({
    tool: "get_players",
  });
  const { data: leaderboard } = useKicktipp<LeaderboardResponse>({
    tool: "get_leaderboard",
  });

  if (playersLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <LeaderboardSkeleton rows={10} />
      </div>
    );
  }

  if (playersError || !players) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load players</h2>
        <p className="text-sm text-muted-foreground">{playersError}</p>
      </div>
    );
  }

  return <PlayersContent players={players} leaderboard={leaderboard} />;
}
