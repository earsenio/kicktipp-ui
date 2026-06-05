"use client";

import { useState } from "react";
import type { LeaderboardResponse, OverviewResponse } from "@/lib/types";
import { LeaderboardTable } from "./leaderboard-table";
import { MatchdaySelector } from "@/components/shared/matchday-selector";
import { Button } from "@/components/ui/button";
import { useKicktipp } from "@/hooks/use-kicktipp";
import { Loader2, RefreshCw } from "lucide-react";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { cn } from "@/lib/utils";

type ViewMode = "matchday" | "season";
type BonusMode = "regular" | "bonus";

interface Props {
  initialData: LeaderboardResponse;
  overview: OverviewResponse | null;
}

export function LeaderboardContent({ initialData, overview }: Props) {
  const [matchday, setMatchday] = useState(1);
  const [view, setView] = useState<ViewMode>("matchday");
  const [bonus, setBonus] = useState<BonusMode>("regular");
  const { refresh: liveRefresh, refreshing: liveRefreshing } = useLiveRefresh(["get_leaderboard"]);

  const { data: fetched, loading } = useKicktipp<LeaderboardResponse>({
    tool: "get_leaderboard",
    args: {
      matchday,
      ...(bonus === "bonus" ? { bonus: true } : {}),
    },
    options: { skip: matchday === 1 && bonus === "regular" },
  });

  const data = matchday === 1 && bonus === "regular" ? initialData : fetched ?? initialData;

  const handleMatchdayChange = (n: number) => {
    setMatchday(n);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button
            variant="ghost"
            size="icon"
            onClick={liveRefresh}
            disabled={liveRefreshing}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", liveRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <MatchdaySelector
          current={matchday}
          onChange={handleMatchdayChange}
        />

        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={view === "matchday" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("matchday")}
            >
              Matchday
            </Button>
            <Button
              variant={view === "season" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setView("season")}
            >
              Season
            </Button>
          </div>

          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant={bonus === "regular" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setBonus("regular")}
            >
              Regular
            </Button>
            <Button
              variant={bonus === "bonus" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setBonus("bonus")}
            >
              Bonus
            </Button>
          </div>
        </div>
      </div>

      {data.title && (
        <p className="text-sm text-muted-foreground">{data.title}</p>
      )}

      {data.matches && data.matches.length > 0 && (
        <div className="rounded-lg border border-border p-3">
          <h2 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Matches
          </h2>
          <div className="space-y-0.5">
            {data.matches.map((m, i) => (
              <div
                key={i}
                className="flex items-center text-sm py-1 gap-2"
              >
                <span className="text-xs text-muted-foreground w-24 shrink-0 hidden sm:inline">
                  {m.date}
                </span>
                <span className="flex-1 text-right truncate font-medium text-xs sm:text-sm">
                  {m.home}
                </span>
                <span className="w-12 text-center font-mono text-xs font-bold">
                  {m.result === "-:-" ? "vs" : m.result}
                </span>
                <span className="flex-1 truncate font-medium text-xs sm:text-sm">
                  {m.away}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <LeaderboardTable
        rankings={data.rankings}
        overview={view === "season" ? overview : null}
      />
    </div>
  );
}
