"use client";

import { motion } from "framer-motion";
import type { LeaderboardRanking, OverviewResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  rankings: LeaderboardRanking[];
  overview: OverviewResponse | null;
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <motion.span
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Trophy className="h-4 w-4 text-yellow-500" />
      </motion.span>
    );
  if (rank === 2)
    return (
      <motion.span
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      >
        <Medal className="h-4 w-4 text-zinc-400" />
      </motion.span>
    );
  if (rank === 3)
    return (
      <motion.span
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <Medal className="h-4 w-4 text-amber-700" />
      </motion.span>
    );
  return null;
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const data = values.map((v) => ({ v }));

  return (
    <div className="w-16 h-6 hidden md:block">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="v" radius={[1, 1, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.v === Math.max(...values)
                    ? "var(--accent-green)"
                    : "var(--muted-foreground)"
                }
                fillOpacity={0.6 + (entry.v / max) * 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function getSparklineData(
  playerName: string,
  overview: OverviewResponse | null
): number[] {
  if (!overview) return [];
  const player = overview.players.find((p) => p.name === playerName);
  if (!player) return [];
  const entries = Object.entries(player.matchdays)
    .map(([k, v]) => ({ md: Number(k), pts: Number(v) || 0 }))
    .sort((a, b) => a.md - b.md);
  return entries.slice(-5).map((e) => e.pts);
}

function getBestMatchday(
  playerName: string,
  overview: OverviewResponse | null
): number | null {
  if (!overview) return null;
  const player = overview.players.find((p) => p.name === playerName);
  if (!player) return null;
  const vals = Object.values(player.matchdays).map(Number).filter(Boolean);
  return vals.length > 0 ? Math.max(...vals) : null;
}

function parseRank(pos: string): number {
  return parseInt(pos.replace(/\D/g, ""), 10) || 0;
}

export function LeaderboardTable({ rankings, overview }: Props) {
  if (rankings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No rankings available yet.
      </p>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th scope="col" className="text-left p-3 w-14">#</th>
              <th scope="col" className="text-left p-3">Player</th>
              <th scope="col" className="text-right p-3 hidden md:table-cell">Trend</th>
              <th scope="col" className="text-right p-3">Day</th>
              <th scope="col" className="text-right p-3">Bonus</th>
              <th scope="col" className="text-right p-3 font-bold">Total</th>
              <th scope="col" className="text-right p-3 hidden md:table-cell">Best</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => {
              const rank = parseRank(r.position);
              const sparkline = getSparklineData(r.name, overview);
              const best = getBestMatchday(r.name, overview);

              return (
                <motion.tr
                  key={r.name}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3, layout: { duration: 0.4 } }}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors hover:bg-muted/30",
                    r.isCurrentPlayer && "bg-primary/8 hover:bg-primary/12",
                    r.isCurrentPlayer && "sticky bottom-0 z-10"
                  )}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <MedalIcon rank={rank} />
                      <span className={cn(
                        "font-mono text-muted-foreground",
                        rank <= 3 && "font-bold text-foreground"
                      )}>
                        {r.position}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={cn(
                      "font-medium",
                      r.isCurrentPlayer && "text-primary font-semibold"
                    )}>
                      {r.name}
                    </span>
                    {r.isCurrentPlayer && (
                      <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        you
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    <MiniSparkline values={sparkline} />
                  </td>
                  <td className="p-3 text-right font-mono">
                    {r.matchdayPoints}
                  </td>
                  <td className="p-3 text-right font-mono text-muted-foreground">
                    {r.bonus}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {r.total}
                  </td>
                  <td className="p-3 text-right hidden md:table-cell">
                    {best !== null && (
                      <span className="text-xs bg-accent-green/15 text-accent-green px-1.5 py-0.5 rounded font-mono">
                        {best}
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
