"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TableTeam } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface ZoneConfig {
  positions: number[];
  color: string;
  label: string;
}

const DEFAULT_ZONES: ZoneConfig[] = [
  { positions: [1, 2, 3, 4], color: "border-l-blue-500", label: "Champions League" },
  { positions: [5, 6], color: "border-l-orange-500", label: "Europa League" },
  { positions: [7], color: "border-l-amber-500", label: "Conference League" },
  { positions: [16], color: "border-l-pink-500", label: "Relegation playoff" },
  { positions: [17, 18], color: "border-l-red-500", label: "Relegation" },
];

function getZoneClass(pos: number, zones: ZoneConfig[]): string | null {
  for (const zone of zones) {
    if (zone.positions.includes(pos)) return zone.color;
  }
  return null;
}

function parsePos(pos: string): number {
  return parseInt(pos.replace(/\D/g, ""), 10) || 0;
}

function TeamDetailPanel({ team }: { team: TableTeam }) {
  const gf = parseInt(team.goalsFor) || 0;
  const ga = parseInt(team.goalsAgainst) || 0;
  const played = parseInt(team.played) || 0;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-4 py-3 bg-muted/30 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground">Wins</span>
          <p className="font-mono font-bold">{team.wins}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Draws</span>
          <p className="font-mono font-bold">{team.draws}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Losses</span>
          <p className="font-mono font-bold">{team.losses}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Avg goals/game</span>
          <p className="font-mono font-bold">
            {played > 0 ? (gf / played).toFixed(1) : "0.0"}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Goals scored</span>
          <p className="font-mono font-bold">{team.goalsFor}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Goals conceded</span>
          <p className="font-mono font-bold">{team.goalsAgainst}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Goal difference</span>
          <p className={cn(
            "font-mono font-bold",
            parseInt(team.goalDifference) > 0 && "text-accent-green",
            parseInt(team.goalDifference) < 0 && "text-accent-red"
          )}>
            {parseInt(team.goalDifference) > 0 ? "+" : ""}
            {team.goalDifference}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Points/game</span>
          <p className="font-mono font-bold">
            {played > 0 ? ((parseInt(team.points) || 0) / played).toFixed(1) : "0.0"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function LeagueTable({
  teams,
  zones = DEFAULT_ZONES,
}: {
  teams: TableTeam[];
  zones?: ZoneConfig[];
}) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  if (teams.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No table data available yet. The season may not have started.
      </p>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 w-10">#</th>
              <th className="text-left p-3">Team</th>
              <th className="text-center p-3">P</th>
              <th className="text-center p-3 hidden sm:table-cell">W</th>
              <th className="text-center p-3 hidden sm:table-cell">D</th>
              <th className="text-center p-3 hidden sm:table-cell">L</th>
              <th className="text-center p-3 hidden md:table-cell">GF</th>
              <th className="text-center p-3 hidden md:table-cell">GA</th>
              <th className="text-center p-3 hidden sm:table-cell">GD</th>
              <th className="text-center p-3 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const pos = parsePos(t.position);
              const zoneColor = getZoneClass(pos, zones);
              const isExpanded = expandedTeam === t.team;
              const gd = parseInt(t.goalDifference) || 0;

              return (
                <motion.tr
                  key={t.team}
                  layout
                  className={cn(
                    "border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/30 border-l-3",
                    zoneColor || "border-l-transparent",
                    isExpanded && "bg-muted/20"
                  )}
                  onClick={() =>
                    setExpandedTeam(isExpanded ? null : t.team)
                  }
                >
                  <td className="p-3 text-muted-foreground font-mono">
                    {t.position}
                  </td>
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      {t.team}
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono">{t.played}</td>
                  <td className="p-3 text-center font-mono hidden sm:table-cell">{t.wins}</td>
                  <td className="p-3 text-center font-mono hidden sm:table-cell">{t.draws}</td>
                  <td className="p-3 text-center font-mono hidden sm:table-cell">{t.losses}</td>
                  <td className="p-3 text-center font-mono hidden md:table-cell">{t.goalsFor}</td>
                  <td className="p-3 text-center font-mono hidden md:table-cell">{t.goalsAgainst}</td>
                  <td className={cn(
                    "p-3 text-center font-mono hidden sm:table-cell",
                    gd > 0 && "text-accent-green",
                    gd < 0 && "text-accent-red"
                  )}>
                    {gd > 0 ? `+${t.goalDifference}` : t.goalDifference}
                  </td>
                  <td className="p-3 text-center font-mono font-bold">{t.points}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {expandedTeam && (
          <TeamDetailPanel
            key={expandedTeam}
            team={teams.find((t) => t.team === expandedTeam)!}
          />
        )}
      </AnimatePresence>

      {zones.length > 0 && teams.length > 0 && (
        <div className="flex flex-wrap gap-3 p-3 border-t border-border text-xs text-muted-foreground">
          {zones.map((z) => (
            <div key={z.label} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded-sm border-l-3", z.color)} />
              {z.label}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
