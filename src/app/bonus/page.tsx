import { Suspense } from "react";
import { callTool } from "@/lib/mcp-client";
import type { BonusQuestion, LeaderboardResponse } from "@/lib/types";
import { BonusContent } from "@/components/bonus/bonus-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

export const dynamic = "force-dynamic";

async function BonusData() {
  let questions: BonusQuestion[] | null = null;
  let bonusLeaderboard: LeaderboardResponse | null = null;
  let error: string | null = null;

  try {
    questions = (await callTool("get_bonus_questions")) as BonusQuestion[];
    bonusLeaderboard = (await callTool("get_leaderboard", {
      bonus: true,
    }).catch(() => null)) as LeaderboardResponse | null;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load bonus questions";
  }

  if (error || !questions) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load bonus questions</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <BonusContent questions={questions} bonusLeaderboard={bonusLeaderboard} />;
}

export default function BonusPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          <TableSkeleton rows={6} cols={2} />
        </div>
      }
    >
      <BonusData />
    </Suspense>
  );
}
