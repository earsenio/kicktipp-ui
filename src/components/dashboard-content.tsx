"use client";

import { MatchCard } from "@/components/match/match-card";
import type { TodayMatchesResponse } from "@/lib/types";
import Link from "next/link";

interface DashboardContentProps {
  matches: TodayMatchesResponse | null;
}

export function DashboardContent({ matches }: DashboardContentProps) {
  const matchList = matches?.matches ?? [];
  const needsBet = matchList.filter((m) => m.needsBet).length;
  const total = matchList.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        {matches?.title && (
          <p className="text-sm text-muted-foreground mt-1">{matches.title}</p>
        )}
      </div>

      {total === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center">
          <p className="text-muted-foreground">No matches scheduled today.</p>
        </div>
      ) : needsBet === 0 ? (
        <div className="rounded-lg bg-accent-green/10 border border-accent-green/30 p-4 text-sm text-accent-green font-medium">
          All bets placed for today
        </div>
      ) : (
        <Link href="/matchday/1">
          <div className="rounded-lg bg-accent-amber/10 border border-accent-amber/30 p-4 text-sm text-accent-amber font-medium cursor-pointer hover:bg-accent-amber/15 transition-colors">
            You have {needsBet} match{needsBet > 1 ? "es" : ""} to predict — Go to Matchday →
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matchList.map((match, i) => (
          <MatchCard key={`${match.home}-${match.away}-${i}`} match={match} />
        ))}
      </div>
    </div>
  );
}
