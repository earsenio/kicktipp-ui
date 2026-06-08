"use client";

import type { BonusQuestionsResponse, LeaderboardResponse } from "@/lib/types";
import { BonusContent } from "@/components/bonus/bonus-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useKicktipp } from "@/hooks/use-kicktipp";

export default function BonusPage() {
  const { data: bonusData, loading, error } = useKicktipp<BonusQuestionsResponse>({
    tool: "get_bonus_questions",
  });
  const { data: bonusLeaderboard } = useKicktipp<LeaderboardResponse>({
    tool: "get_leaderboard",
    args: { bonus: true },
  });

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <TableSkeleton rows={6} cols={2} />
      </div>
    );
  }

  if (error || !bonusData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load bonus questions</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <BonusContent
      questions={bonusData.questions}
      deadline={bonusData.deadline}
      bonusLeaderboard={bonusLeaderboard}
    />
  );
}
