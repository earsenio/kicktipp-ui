"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeaderboardRanking } from "@/lib/types";
import { Trophy, Medal } from "lucide-react";

interface PlayerWithRank {
  name: string;
  ranking: LeaderboardRanking | null;
  color: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-3.5 w-3.5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-3.5 w-3.5 text-zinc-400" />;
  if (rank === 3) return <Medal className="h-3.5 w-3.5 text-amber-700" />;
  return null;
}

export function PlayerCard({
  player,
  onClick,
}: {
  player: PlayerWithRank;
  onClick: () => void;
}) {
  const rank = parseInt(player.ranking?.position?.replace(/\D/g, "") || "0") || 0;
  const initials = player.name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md",
          player.ranking?.isCurrentPlayer && "border-primary/30 bg-primary/5"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: player.color }}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">
                {player.name}
              </span>
              {player.ranking?.isCurrentPlayer && (
                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                  you
                </span>
              )}
            </div>

            {player.ranking ? (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  <RankBadge rank={rank} />
                  <span className="text-xs text-muted-foreground font-mono">
                    #{player.ranking.position}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {player.ranking.total} pts
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No ranking data</span>
            )}
          </div>

          {player.ranking && (
            <div className="text-right shrink-0">
              <div className="text-lg font-bold font-mono">
                {player.ranking.matchdayPoints}
              </div>
              <div className="text-[10px] text-muted-foreground">day pts</div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
