"use client";

import { MatchCard } from "@/components/match/match-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { TodayMatchesResponse } from "@/lib/types";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { Button } from "@/components/ui/button";
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
  const { isLive, refresh, refreshing } = useLiveRefresh(["get_today_matches"]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          {matches?.title && (
            <p className="text-sm text-muted-foreground mt-1">{matches.title}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
          />
        </Button>
      </div>

      {total === 0 ? (
        <EmptyState
          page="dashboard"
          title="No matches today"
          description="There are no matches scheduled for today. Check back later or browse the full schedule."
          action={{ label: "View Schedule", href: "/schedule" }}
        />
      ) : needsBet === 0 ? (
        <div className="rounded-lg bg-accent-green/10 border border-accent-green/30 p-4 text-sm text-accent-green font-medium">
          All bets placed for today
        </div>
      ) : (
        <Link href="/matchday/1">
          <div className="rounded-lg bg-accent-amber/10 border border-accent-amber/30 p-4 text-sm text-accent-amber font-medium cursor-pointer hover:bg-accent-amber/15 transition-colors">
            You have {needsBet} match{needsBet > 1 ? "es" : ""} to predict — Go to Matchday →
          </div>
        </Link>
      )}

      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matchList.map((match, i) => (
            <motion.div
              key={`${match.home}-${match.away}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: "easeOut" }}
            >
              <MatchCard match={match} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
