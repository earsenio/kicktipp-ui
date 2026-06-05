"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useKicktipp } from "@/hooks/use-kicktipp";
import type { OverviewResponse, LeaderboardRanking } from "@/lib/types";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
} from "recharts";

interface PlayerWithRank {
  name: string;
  ranking: LeaderboardRanking | null;
  color: string;
}

function computeDerivedStats(
  playerName: string,
  overview: OverviewResponse
) {
  const player = overview.players.find((p) => p.name === playerName);
  if (!player) return null;

  const entries = Object.entries(player.matchdays)
    .map(([k, v]) => ({ md: Number(k), pts: Number(v) || 0 }))
    .filter((e) => e.pts > 0)
    .sort((a, b) => a.md - b.md);

  if (entries.length === 0) return null;

  const points = entries.map((e) => e.pts);
  const avg = points.reduce((a, b) => a + b, 0) / points.length;
  const variance =
    points.reduce((sum, p) => sum + (p - avg) ** 2, 0) / points.length;
  const stdDev = Math.sqrt(variance);
  const consistency = avg > 0 ? Math.max(0, 100 - (stdDev / avg) * 100) : 0;

  const aboveAvg = points.filter((p) => p >= avg).length;
  const aboveAvgPct = (aboveAvg / points.length) * 100;

  let currentStreak = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].pts >= avg) {
      currentStreak++;
    } else {
      break;
    }
  }

  let top3Count = 0;
  for (const entry of entries) {
    const mdScores = overview.players
      .map((p) => ({
        name: p.name,
        pts: Number(p.matchdays[entry.md]) || 0,
      }))
      .filter((s) => s.pts > 0)
      .sort((a, b) => b.pts - a.pts);
    const rank = mdScores.findIndex((s) => s.name === playerName);
    if (rank >= 0 && rank < 3) top3Count++;
  }

  const trend =
    entries.length >= 3
      ? entries.slice(-3).reduce((s, e) => s + e.pts, 0) / 3 - avg
      : 0;

  const totalMatchdays = overview.maxMatchday;
  const playedMatchdays = entries.length;
  const unplayed = totalMatchdays - playedMatchdays;

  const overallAvg = computeOverallAvg(overview);
  const strong = points.filter((p) => p >= overallAvg * 1.2).length;
  const mid = points.filter(
    (p) => p >= overallAvg * 0.8 && p < overallAvg * 1.2
  ).length;
  const weak = playedMatchdays - strong - mid;

  return {
    consistency: Math.round(consistency),
    aboveAvgPct: Math.round(aboveAvgPct),
    currentStreak,
    top3Count,
    trend,
    avg,
    distribution: {
      strong,
      average: mid,
      weak,
      unplayed,
    },
  };
}

function computeOverallAvg(overview: OverviewResponse): number {
  let totalPts = 0;
  let count = 0;
  for (let md = 1; md <= overview.maxMatchday; md++) {
    overview.players.forEach((p) => {
      const pts = Number(p.matchdays[md]) || 0;
      if (pts > 0) {
        totalPts += pts;
        count++;
      }
    });
  }
  return count > 0 ? totalPts / count : 0;
}

export function PlayerDetailDrawer({
  player,
  open,
  onClose,
}: {
  player: PlayerWithRank | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: overview, loading } = useKicktipp<OverviewResponse>({
    tool: "get_overview",
    options: { skip: !open },
  });

  const overviewPlayer = overview?.players.find(
    (p) => p.name === player?.name
  );

  const chartData = overviewPlayer
    ? Object.entries(overviewPlayer.matchdays)
        .map(([md, pts]) => ({
          matchday: `MD${md}`,
          points: parseInt(pts) || 0,
        }))
        .sort(
          (a, b) =>
            parseInt(a.matchday.slice(2)) - parseInt(b.matchday.slice(2))
        )
    : [];

  const best =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.points)) : 0;
  const worst =
    chartData.length > 0 ? Math.min(...chartData.map((d) => d.points)) : 0;
  const avg =
    chartData.length > 0
      ? chartData.reduce((s, d) => s + d.points, 0) / chartData.length
      : 0;

  const derived =
    overview && player ? computeDerivedStats(player.name, overview) : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            {player && (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: player.color }}
              >
                {player.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {player?.name}
            {derived && (
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
                {derived.trend > 1 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-accent-green" />
                ) : derived.trend < -1 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-accent-red" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                {derived.trend > 0 ? "+" : ""}
                {derived.trend.toFixed(1)}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {player?.ranking && (
              <div className="grid grid-cols-3 gap-3">
                <StatBox
                  label="Rank"
                  value={`#${player.ranking.position}`}
                />
                <StatBox label="Total" value={player.ranking.total} />
                <StatBox label="Bonus" value={player.ranking.bonus} />
              </div>
            )}

            {chartData.length > 0 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <StatBox
                    label="Best MD"
                    value={String(best)}
                    accent="green"
                  />
                  <StatBox
                    label="Worst MD"
                    value={String(worst)}
                    accent="red"
                  />
                  <StatBox label="Avg" value={avg.toFixed(1)} />
                </div>

                {derived && (
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox
                      label="Consistency"
                      value={`${derived.consistency}%`}
                      accent={derived.consistency >= 60 ? "green" : undefined}
                    />
                    <StatBox
                      label="Above Avg"
                      value={`${derived.aboveAvgPct}%`}
                    />
                    <StatBox
                      label="Top 3 MDs"
                      value={String(derived.top3Count)}
                      accent={derived.top3Count > 0 ? "green" : undefined}
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Points per matchday
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis
                          dataKey="matchday"
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <ReferenceLine
                          y={avg}
                          stroke="var(--muted-foreground)"
                          strokeDasharray="3 3"
                          strokeOpacity={0.5}
                        />
                        <Bar dataKey="points" radius={[3, 3, 0, 0]}>
                          {chartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                entry.points === best
                                  ? "var(--accent-green)"
                                  : entry.points === worst
                                    ? "var(--accent-red)"
                                    : player?.color || "var(--primary)"
                              }
                              fillOpacity={0.8}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {derived?.distribution && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Performance distribution
                </h3>
                <div className="flex items-center gap-4">
                  <div className="h-32 w-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Strong",
                              value: derived.distribution.strong,
                              fill: "var(--accent-green)",
                            },
                            {
                              name: "Average",
                              value: derived.distribution.average,
                              fill: "var(--accent-amber, #f59e0b)",
                            },
                            {
                              name: "Weak",
                              value: derived.distribution.weak,
                              fill: "var(--accent-red)",
                            },
                            ...(derived.distribution.unplayed > 0
                              ? [
                                  {
                                    name: "Unplayed",
                                    value: derived.distribution.unplayed,
                                    fill: "var(--muted)",
                                  },
                                ]
                              : []),
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-accent-green" />
                      <span>
                        Strong: {derived.distribution.strong}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>
                        Average: {derived.distribution.average}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-accent-red" />
                      <span>
                        Weak: {derived.distribution.weak}
                      </span>
                    </div>
                    {derived.distribution.unplayed > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                        <span>
                          Unplayed: {derived.distribution.unplayed}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {overviewPlayer && (
              <div className="grid grid-cols-2 gap-3">
                <StatBox
                  label="Season wins"
                  value={overviewPlayer.wins || "0"}
                />
                <StatBox
                  label="Season total"
                  value={overviewPlayer.total}
                />
              </div>
            )}

            {derived && derived.currentStreak > 0 && (
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-3 text-center">
                <span className="text-sm font-medium text-accent-green">
                  {derived.currentStreak} matchday streak above average
                </span>
              </div>
            )}

            {chartData.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matchday data available yet.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
}) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div
        className={`text-lg font-bold font-mono ${
          accent === "green"
            ? "text-accent-green"
            : accent === "red"
              ? "text-accent-red"
              : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
