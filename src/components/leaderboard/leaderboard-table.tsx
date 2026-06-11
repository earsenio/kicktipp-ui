"use client";

import { motion } from "framer-motion";
import type { LeaderboardRanking } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";

interface Props {
  rankings: LeaderboardRanking[];
}

function parseRank(pos: string): number {
  return parseInt(pos.replace(/\D/g, ""), 10) || 0;
}

const podiumColors = {
  1: {
    bg: "rgba(234,179,8,0.12)",
    border: "#eab308",
    text: "#eab308",
  },
  2: {
    bg: "rgba(161,161,170,0.12)",
    border: "#71717a",
    text: "#a1a1aa",
  },
  3: {
    bg: "rgba(180,83,9,0.12)",
    border: "#92400e",
    text: "#b45309",
  },
} as const;

function PodiumColumn({ player, rank }: { player: LeaderboardRanking; rank: 1 | 2 | 3 }) {
  const colors = podiumColors[rank];
  const isFirst = rank === 1;
  const barHeight = rank === 1 ? "h-16" : rank === 2 ? "h-12" : "h-8";
  const avatarSize = isFirst ? "w-[52px] h-[52px] text-base" : "w-[44px] h-[44px] text-sm";
  const ptsSize = isFirst ? "text-lg" : "text-base";

  return (
    <div className="flex flex-col items-center gap-1.5">
      {isFirst && <div className="text-xl leading-none">👑</div>}
      <div
        className={cn("rounded-full flex items-center justify-center font-extrabold border-2", avatarSize)}
        style={{
          background: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        {rank}
      </div>
      <div className="text-xs font-semibold text-center max-w-[80px] truncate text-foreground">
        {player.name}
      </div>
      <div className={cn("font-mono font-extrabold", ptsSize)} style={{ color: colors.text }}>
        {player.total}
      </div>
      <div
        className={cn("w-[72px] rounded-t-xl", barHeight)}
        style={{
          background:
            rank === 1
              ? "rgba(234,179,8,0.12)"
              : rank === 2
                ? "rgba(161,161,170,0.1)"
                : "rgba(180,83,9,0.1)",
        }}
      />
    </div>
  );
}

function PlayerRow({
  player,
  index,
}: {
  player: LeaderboardRanking;
  index: number;
}) {
  const rank = parseRank(player.position);
  const isYou = player.isCurrentPlayer;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        "flex items-center gap-3 py-3 px-4 border-b border-border transition-colors",
        isYou && "bg-primary/[0.06] border-l-[3px] border-l-primary"
      )}
    >
      <span className="font-mono text-sm font-semibold text-muted-foreground w-6 text-center shrink-0">
        {rank}
      </span>
      <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
        {getInitials(player.name)}
      </div>
      <div className="flex-1 min-w-0 flex items-center">
        <span
          className={cn(
            "text-sm truncate",
            isYou ? "font-bold text-primary" : "font-medium text-foreground"
          )}
        >
          {player.name}
        </span>
        {isYou && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-2 shrink-0 bg-primary/15 text-primary">
            you
          </span>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm font-extrabold">{player.total}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {(parseInt(player.total) || 0) - (parseInt(player.bonus) || 0)} pts + {player.bonus} bonus
        </div>
      </div>
    </motion.div>
  );
}

export function LeaderboardPodium({ rankings }: Props) {
  if (rankings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No rankings available yet.
      </p>
    );
  }

  const sorted = [...rankings].sort((a, b) => parseRank(a.position) - parseRank(b.position));
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const hasPodium = top3.length >= 3;
  const podiumOrder = hasPodium ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <>
      {/* Podium */}
      {hasPodium && (
        <div className="flex justify-center items-end gap-3 px-4 pt-4 pb-3">
          {podiumOrder.map((p) => {
            const rank = parseRank(p.position) as 1 | 2 | 3;
            return <PodiumColumn key={p.name} player={p} rank={rank} />;
          })}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-border mx-4" />

      {/* Player list */}
      <div>
        {(hasPodium ? rest : sorted).map((p, i) => (
          <PlayerRow key={p.name} player={p} index={i} />
        ))}
      </div>
    </>
  );
}
