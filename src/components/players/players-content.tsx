"use client";

import { useState, useMemo } from "react";
import type { LeaderboardResponse, LeaderboardRanking } from "@/lib/types";
import { PlayerCard } from "./player-card";
import { PlayerDetailDrawer } from "./player-detail-drawer";
import { Search } from "lucide-react";

type SortMode = "rank" | "name" | "points";

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

interface PlayerWithRank {
  name: string;
  ranking: LeaderboardRanking | null;
  color: string;
}

export function PlayersContent({
  players,
  leaderboard,
}: {
  players: string[];
  leaderboard: LeaderboardResponse | null;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("rank");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const enriched: PlayerWithRank[] = useMemo(() => {
    return players.map((name) => ({
      name,
      ranking:
        leaderboard?.rankings.find((r) => r.name === name) ?? null,
      color: nameToColor(name),
    }));
  }, [players, leaderboard]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "points") {
        const aTotal = parseInt(a.ranking?.total || "0") || 0;
        const bTotal = parseInt(b.ranking?.total || "0") || 0;
        return bTotal - aTotal;
      }
      const aPos = parseInt(a.ranking?.position?.replace(/\D/g, "") || "999") || 999;
      const bPos = parseInt(b.ranking?.position?.replace(/\D/g, "") || "999") || 999;
      return aPos - bPos;
    });
    return list;
  }, [enriched, search, sort]);

  const selected = enriched.find((p) => p.name === selectedPlayer) ?? null;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">Players</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-1 text-xs">
          {(["rank", "name", "points"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2.5 py-1.5 rounded-md capitalize transition-colors ${
                sort === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground sm:ml-auto">
          {filtered.length} player{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((p) => (
          <PlayerCard
            key={p.name}
            player={p}
            onClick={() => setSelectedPlayer(p.name)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No players found.
        </p>
      )}

      <PlayerDetailDrawer
        player={selected}
        open={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}
