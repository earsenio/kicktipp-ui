"use client";

import { motion } from "framer-motion";
import type { LeaderboardRanking, OverviewResponse } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";

interface Props {
  rankings: LeaderboardRanking[];
  overview: OverviewResponse | null;
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
  const barHeight = rank === 1 ? "h-14" : rank === 2 ? "h-10" : "h-7";
  const avatarSize = isFirst ? "w-[50px] h-[50px] text-sm" : "w-[42px] h-[42px] text-xs";
  const ptsSize = isFirst ? "text-[17px]" : "text-sm";

  return (
    <div className="flex flex-col items-center gap-1">
      {isFirst && <div className="text-lg leading-none">👑</div>}
      <div
        className={cn("rounded-full flex items-center justify-center font-extrabold", avatarSize)}
        style={{
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          color: colors.text,
        }}
      >
        {rank}
      </div>
      <div className="text-[11px] font-semibold text-center max-w-[72px] truncate">
        {player.name}
      </div>
      <div className={cn("font-mono font-extrabold", ptsSize)} style={{ color: colors.text }}>
        {player.total}
      </div>
      <div
        className={cn("w-[68px] rounded-t-[10px]", barHeight)}
        style={{
          background:
            rank === 1
              ? "rgba(234,179,8,0.08)"
              : rank === 2
                ? "rgba(161,161,170,0.06)"
                : "rgba(180,83,9,0.06)",
        }}
      />
    </div>
  );
}

function PlayerRow({
  player,
  index,
  accent = "#3b82f6",
}: {
  player: LeaderboardRanking;
  index: number;
  accent?: string;
}) {
  const rank = parseRank(player.position);
  const isYou = player.isCurrentPlayer;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        "flex items-center gap-2.5 py-2.5 px-4 border-b border-white/[0.03] transition-colors",
        isYou && "border-l-[2.5px]"
      )}
      style={
        isYou
          ? { background: `${accent}10`, borderLeftColor: accent }
          : { borderLeftWidth: "2.5px", borderLeftColor: "transparent" }
      }
    >
      <span className="font-mono text-[13px] font-semibold text-white/40 w-[22px] text-center shrink-0">
        {rank}
      </span>
      <div className="w-[30px] h-[30px] rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/35 shrink-0">
        {getInitials(player.name)}
      </div>
      <div className="flex-1 min-w-0 flex items-center">
        <span
          className={cn(
            "text-[13px] truncate",
            isYou ? "font-bold" : "font-medium"
          )}
          style={isYou ? { color: accent } : undefined}
        >
          {player.name}
        </span>
        {isYou && (
          <span
            className="text-[9px] font-bold px-1.5 py-px rounded-[5px] ml-1.5 shrink-0"
            style={{ background: `${accent}22`, color: accent }}
          >
            you
          </span>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-sm font-extrabold">{player.total}</div>
        <div className="text-[9px] text-white/30 mt-px">
          {player.matchdayPoints} day · {player.bonus} bon
        </div>
      </div>
    </motion.div>
  );
}

export function LeaderboardPodium({ rankings, overview }: Props) {
  if (rankings.length === 0) {
    return (
      <p className="text-sm text-white/40 text-center py-8">
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
        <div className="flex justify-center items-end gap-2.5 px-4 pt-2 pb-1">
          {podiumOrder.map((p) => {
            const rank = parseRank(p.position) as 1 | 2 | 3;
            return <PodiumColumn key={p.name} player={p} rank={rank} />;
          })}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/[0.05] mx-4" />

      {/* Player list */}
      <div>
        {(hasPodium ? rest : sorted).map((p, i) => (
          <PlayerRow key={p.name} player={p} index={i} />
        ))}
      </div>
    </>
  );
}
