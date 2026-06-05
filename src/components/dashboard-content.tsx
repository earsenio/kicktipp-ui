"use client";

import { MatchCard } from "@/components/match/match-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { TodayMatchesResponse } from "@/lib/types";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

interface DashboardContentProps {
  matches: TodayMatchesResponse | null;
}

export function DashboardContent({ matches }: DashboardContentProps) {
  const matchList = matches?.matches ?? [];
  const needsBet = matchList.filter((m) => m.needsBet).length;
  const total = matchList.length;
  const { refresh, refreshing } = useLiveRefresh(["get_today_matches"]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Dashboard</h1>
          {matches?.title && (
            <p className="text-xs text-white/40 mt-0.5">{matches.title}</p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="h-9 w-9 rounded-full bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white/80 transition-all disabled:opacity-30"
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {total === 0 ? (
        <EmptyState
          page="dashboard"
          title="No matches today"
          description="There are no matches scheduled for today. Check back later or browse the full schedule."
          action={{ label: "View Schedule", href: "/schedule" }}
        />
      ) : needsBet === 0 ? (
        <div className="rounded-[14px] bg-green-500/[0.08] border-[1.5px] border-green-500/20 p-4 text-sm text-green-500 font-semibold">
          All bets placed for today
        </div>
      ) : (
        <Link href="/matchday/1">
          <div className="rounded-[14px] bg-amber-500/[0.08] border-[1.5px] border-amber-500/25 p-4 text-sm text-amber-500 font-semibold cursor-pointer hover:bg-amber-500/[0.12] transition-colors">
            You have {needsBet} match{needsBet > 1 ? "es" : ""} to predict — Go to Predictions →
          </div>
        </Link>
      )}

      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {matchList.map((match, i) => (
            <motion.div
              key={`${match.home}-${match.away}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <MatchCard match={match} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
