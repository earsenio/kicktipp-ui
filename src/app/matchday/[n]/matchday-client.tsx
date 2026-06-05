"use client";

import type { BetsResponse } from "@/lib/types";
import { BatchBetForm } from "@/components/match/batch-bet-form";
import { MatchCardSkeletonGrid } from "@/components/shared/loading-skeleton";
import { useKicktipp } from "@/hooks/use-kicktipp";

export function MatchdayClient({ n }: { n: string }) {
  const matchday = parseInt(n, 10) || 1;

  const { data, loading, error } = useKicktipp<BetsResponse>({
    tool: "get_bets",
    args: { matchday },
  });

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <MatchCardSkeletonGrid count={6} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load matchday</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <BatchBetForm
      matchday={matchday}
      title={data.title}
      matches={data.matches}
    />
  );
}
