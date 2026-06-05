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
  Legend,
  ResponsiveContainer,
} from "recharts";

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 55%)`;
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
      <div className="h-[350px] md:h-[450px]">
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
            <Legend
              onClick={(e) => {
                if (typeof e.value === "string") togglePlayer(e.value);
              }}
              wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
            />
            {data.players.map((p) => (
              <Line
                key={p.name}
                type="monotone"
                dataKey={p.name}
                stroke={
                  p.isCurrentPlayer
                    ? "var(--accent-green)"
                    : nameToColor(p.name)
                }
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
    </Card>
  );
}
