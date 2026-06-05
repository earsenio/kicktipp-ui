"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { MatchCountdown } from "@/components/match/match-countdown";
import type { TodayMatch } from "@/lib/types";

function TeamInitials({ name }: { name: string }) {
  const initials = name
    .split(/[\s-]+/)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
      {initials}
    </div>
  );
}

interface MatchCardProps {
  match: TodayMatch;
}

export function MatchCard({ match }: MatchCardProps) {
  const hasBet = match.bet && match.bet !== "-" && match.bet !== "";
  const needsBet = match.needsBet;

  return (
    <Card
      role="article"
      aria-label={`${match.home} vs ${match.away}, kickoff ${match.time}`}
      className={cn(
        "p-4 transition-all border-2",
        needsBet && "border-accent-amber/40 animate-pulse-border",
        hasBet && !needsBet && "border-accent-green/30",
        !hasBet && !needsBet && "border-border"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <TeamInitials name={match.home} />
          <span className="text-sm font-medium truncate">{match.home}</span>
        </div>

        <div className="flex flex-col items-center shrink-0 px-2">
          <span className="font-mono text-lg font-bold tracking-wider">
            {hasBet ? match.bet : "—"}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {hasBet ? "your bet" : "no bet"}
          </span>
        </div>

        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-sm font-medium truncate text-right">{match.away}</span>
          <TeamInitials name={match.away} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{match.time}</span>
          <MatchCountdown time={match.time} />
        </div>
        {match.odds.home && (
          <span className="font-mono text-[10px]">
            {match.odds.home} · {match.odds.draw} · {match.odds.away}
          </span>
        )}
      </div>
    </Card>
  );
}
