"use client";

import type { OverviewResponse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";

function pointsToColor(pts: number, max: number): string {
  if (max === 0) return "bg-muted";
  const ratio = pts / max;
  if (ratio >= 0.8) return "bg-green-500/80";
  if (ratio >= 0.6) return "bg-green-500/50";
  if (ratio >= 0.4) return "bg-amber-500/50";
  if (ratio >= 0.2) return "bg-amber-500/30";
  return "bg-muted-foreground/20";
}

interface TooltipData {
  player: string;
  matchday: number;
  points: number;
  x: number;
  y: number;
}

export function OverviewHeatmap({ data }: { data: OverviewResponse }) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const matchdayCols =
    data.maxMatchday > 0
      ? Array.from({ length: data.maxMatchday }, (_, i) => i + 1)
      : [];

  const allPoints = data.players.flatMap((p) =>
    Object.values(p.matchdays).map(Number).filter(Boolean)
  );
  const maxPoints = allPoints.length > 0 ? Math.max(...allPoints) : 0;

  if (data.players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No overview data available yet.
      </p>
    );
  }

  return (
    <Card className="overflow-hidden relative">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-2 text-xs sticky left-0 bg-muted/50 z-10 min-w-[120px]">
                Player
              </th>
              {matchdayCols.map((n) => (
                <th
                  key={n}
                  className="text-center p-1 text-[10px] min-w-[32px]"
                >
                  {n}
                </th>
              ))}
              <th className="text-right p-2 text-xs font-bold min-w-[48px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.players.map((p) => (
              <tr
                key={p.name}
                className={cn(
                  "border-b border-border last:border-0",
                  p.isCurrentPlayer && "bg-primary/8"
                )}
              >
                <td
                  className={cn(
                    "p-2 sticky left-0 z-10 bg-background text-xs",
                    p.isCurrentPlayer && "bg-primary/8"
                  )}
                >
                  <span
                    className={cn(
                      "font-medium whitespace-nowrap",
                      p.isCurrentPlayer && "text-primary font-semibold"
                    )}
                  >
                    {p.name}
                  </span>
                </td>
                {matchdayCols.map((n) => {
                  const val = p.matchdays[n];
                  const pts = parseInt(val) || 0;
                  const hasValue = val && val !== "0" && val !== "";
                  return (
                    <td
                      key={n}
                      className="p-0.5 text-center"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          player: p.name,
                          matchday: n,
                          points: pts,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        className={cn(
                          "mx-auto w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-mono transition-colors",
                          hasValue
                            ? pointsToColor(pts, maxPoints)
                            : "bg-muted/50"
                        )}
                      >
                        {hasValue ? pts : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="p-2 text-right font-mono text-xs font-bold">
                  {p.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="font-semibold">{tooltip.player}</span>
          <span className="text-muted-foreground">
            {" "}· Matchday {tooltip.matchday} · {tooltip.points} points
          </span>
        </div>
      )}
    </Card>
  );
}
