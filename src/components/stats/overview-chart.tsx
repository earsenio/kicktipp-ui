"use client";

import type { OverviewResponse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

// Each player's line color: the current player is always the accent green to match
// their emphasized line, everyone else gets a stable hash-derived hue.
function playerColor(name: string, isCurrentPlayer: boolean): string {
  return isCurrentPlayer ? "var(--accent-green)" : nameToColor(name);
}

export function OverviewChart({ data }: { data: OverviewResponse }) {
  const [hiddenPlayers, setHiddenPlayers] = useState<Set<string>>(new Set());

  const matchdayCols = useMemo(
    () =>
      data.maxMatchday > 0
        ? Array.from({ length: data.maxMatchday }, (_, i) => i + 1)
        : [],
    [data.maxMatchday]
  );

  const chartData = useMemo(() => {
    return matchdayCols.map((md) => {
      const point: Record<string, string | number> = { matchday: `MD ${md}` };
      data.players.forEach((p) => {
        let cumulative = 0;
        for (let i = 1; i <= md; i++) {
          cumulative += parseInt(p.matchdays[i]) || 0;
        }
        point[p.name] = cumulative;
      });
      return point;
    });
  }, [data.players, matchdayCols]);

  const togglePlayer = (name: string) => {
    setHiddenPlayers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (data.players.length === 0 || matchdayCols.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No data to chart yet.
      </p>
    );
  }

  return (
    <Card className="p-4">
      {/* Chart fills most of the viewport on mobile; fixed height on desktop. */}
      <div className="h-[65vh] md:h-[450px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="matchday"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            {data.players.map((p) => (
              <Line
                key={p.name}
                type="monotone"
                dataKey={p.name}
                stroke={playerColor(p.name, p.isCurrentPlayer)}
                strokeWidth={p.isCurrentPlayer ? 3 : 1.5}
                strokeOpacity={
                  hiddenPlayers.has(p.name) ? 0 : p.isCurrentPlayer ? 1 : 0.5
                }
                dot={false}
                activeDot={
                  hiddenPlayers.has(p.name) ? false : { r: 3, strokeWidth: 0 }
                }
                hide={hiddenPlayers.has(p.name)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Player selector: one-column checkbox list. Replaces the inline legend so
          lines are easy to toggle on touch. Checked = line visible. */}
      <ul className="mt-4 flex flex-col gap-0.5 border-t border-border pt-3">
        {data.players.map((p) => {
          const visible = !hiddenPlayers.has(p.name);
          return (
            <li key={p.name}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted",
                  p.isCurrentPlayer && "bg-[var(--accent-green)]/10"
                )}
              >
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => togglePlayer(p.name)}
                  className="h-4 w-4 shrink-0 accent-[var(--accent-green)]"
                />
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: playerColor(p.name, p.isCurrentPlayer),
                    opacity: visible ? 1 : 0.3,
                  }}
                />
                <span
                  className={cn(
                    "truncate text-sm",
                    p.isCurrentPlayer ? "font-bold text-foreground" : "text-muted-foreground",
                    !visible && "line-through opacity-60"
                  )}
                >
                  {p.name}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
