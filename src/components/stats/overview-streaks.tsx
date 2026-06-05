"use client";

import type { OverviewResponse, OverviewPlayer } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

type SortKey = "rank" | "best" | "worst" | "avg" | "streak" | "top3";

interface PlayerStats {
  name: string;
  position: string;
  isCurrentPlayer: boolean;
  best: number;
  bestMd: number;
  worst: number;
  worstMd: number;
  avg: number;
  streak: number;
  top3Count: number;
  total: string;
}

function computeStats(
  player: OverviewPlayer,
  allPlayers: OverviewPlayer[],
  maxMatchday: number
): PlayerStats {
  const entries = Object.entries(player.matchdays)
    .map(([k, v]) => ({ md: Number(k), pts: Number(v) || 0 }))
    .filter((e) => e.pts > 0)
    .sort((a, b) => a.md - b.md);

  const points = entries.map((e) => e.pts);
  const best = points.length > 0 ? Math.max(...points) : 0;
  const worst = points.length > 0 ? Math.min(...points) : 0;
  const bestMd = entries.find((e) => e.pts === best)?.md ?? 0;
  const worstMd = entries.find((e) => e.pts === worst)?.md ?? 0;
  const avg =
    points.length > 0
      ? points.reduce((a, b) => a + b, 0) / points.length
      : 0;

  const overallAvg = computeOverallAvg(allPlayers, maxMatchday);
  let streak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].pts >= overallAvg) {
      streak++;
    } else {
      break;
    }
  }

  let top3Count = 0;
  for (let md = 1; md <= maxMatchday; md++) {
    const mdScores = allPlayers
      .map((p) => ({
        name: p.name,
        pts: Number(p.matchdays[md]) || 0,
      }))
      .filter((s) => s.pts > 0)
      .sort((a, b) => b.pts - a.pts);
    if (
      mdScores.length >= 3 &&
      mdScores.findIndex((s) => s.name === player.name) < 3 &&
      mdScores.findIndex((s) => s.name === player.name) >= 0
    ) {
      top3Count++;
    }
  }

  return {
    name: player.name,
    position: player.position,
    isCurrentPlayer: player.isCurrentPlayer,
    best,
    bestMd,
    worst,
    worstMd,
    avg,
    streak,
    top3Count,
    total: player.total,
  };
}

function computeOverallAvg(
  players: OverviewPlayer[],
  maxMatchday: number
): number {
  let totalPts = 0;
  let count = 0;
  for (let md = 1; md <= maxMatchday; md++) {
    players.forEach((p) => {
      const pts = Number(p.matchdays[md]) || 0;
      if (pts > 0) {
        totalPts += pts;
        count++;
      }
    });
  }
  return count > 0 ? totalPts / count : 0;
}

export function OverviewStreaks({ data }: { data: OverviewResponse }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const stats = data.players.map((p) =>
    computeStats(p, data.players, data.maxMatchday)
  );

  const sorted = [...stats].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "rank":
        cmp = parseInt(a.position) - parseInt(b.position);
        break;
      case "best":
        cmp = b.best - a.best;
        break;
      case "worst":
        cmp = a.worst - b.worst;
        break;
      case "avg":
        cmp = b.avg - a.avg;
        break;
      case "streak":
        cmp = b.streak - a.streak;
        break;
      case "top3":
        cmp = b.top3Count - a.top3Count;
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  if (data.players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No data available yet.
      </p>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <SortHeader
                label="#"
                sortKey="rank"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
                className="w-10"
              />
              <th className="text-left p-2.5 text-xs">Player</th>
              <SortHeader
                label="Best"
                sortKey="best"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortHeader
                label="Worst"
                sortKey="worst"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortHeader
                label="Avg"
                sortKey="avg"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortHeader
                label="Streak"
                sortKey="streak"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <SortHeader
                label="Top 3"
                sortKey="top3"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr
                key={s.name}
                className={cn(
                  "border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                  s.isCurrentPlayer && "bg-primary/8"
                )}
              >
                <td className="p-2.5 font-mono text-muted-foreground text-xs">
                  {s.position}
                </td>
                <td className="p-2.5">
                  <span
                    className={cn(
                      "font-medium text-xs",
                      s.isCurrentPlayer && "text-primary font-semibold"
                    )}
                  >
                    {s.name}
                  </span>
                </td>
                <td className="p-2.5 text-right">
                  <span className="font-mono text-xs text-accent-green">
                    {s.best}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    MD{s.bestMd}
                  </span>
                </td>
                <td className="p-2.5 text-right">
                  <span className="font-mono text-xs text-accent-red">
                    {s.worst}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    MD{s.worstMd}
                  </span>
                </td>
                <td className="p-2.5 text-right font-mono text-xs">
                  {s.avg.toFixed(1)}
                </td>
                <td className="p-2.5 text-right font-mono text-xs hidden sm:table-cell">
                  {s.streak > 0 ? (
                    <span className="bg-accent-green/15 text-accent-green px-1.5 py-0.5 rounded">
                      {s.streak}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
                <td className="p-2.5 text-right font-mono text-xs hidden sm:table-cell">
                  {s.top3Count > 0 ? (
                    <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                      {s.top3Count}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  asc,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "p-2.5 text-xs text-right cursor-pointer select-none hover:text-foreground transition-colors",
        current === sortKey ? "text-foreground" : "text-muted-foreground",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {current === sortKey && (
          <ArrowUpDown className="h-3 w-3" />
        )}
      </span>
    </th>
  );
}
