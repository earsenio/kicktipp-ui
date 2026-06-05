import { Suspense } from "react";
import { callTool } from "@/lib/mcp-client";
import type { LeaderboardResponse } from "@/lib/types";
import { PlayersContent } from "@/components/players/players-content";
import { LeaderboardSkeleton } from "@/components/shared/loading-skeleton";

export const dynamic = "force-dynamic";

async function PlayersData() {
  let players: string[] | null = null;
  let leaderboard: LeaderboardResponse | null = null;
  let error: string | null = null;

  try {
    players = (await callTool("get_players")) as string[];
    leaderboard = (await callTool("get_leaderboard").catch(() => null)) as LeaderboardResponse | null;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load players";
  }

  if (error || !players) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load players</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <PlayersContent players={players} leaderboard={leaderboard} />;
}

export default function PlayersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          <LeaderboardSkeleton rows={10} />
        </div>
      }
    >
      <PlayersData />
    </Suspense>
  );
}
