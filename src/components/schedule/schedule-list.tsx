"use client";

import { useState, useMemo } from "react";
import type { ScheduleMatch } from "@/lib/types";
import { parseMatchDate } from "./schedule-content";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MatchGroup {
  label: string;
  dateRange: string;
  matches: ScheduleMatch[];
  completedCount: number;
  isUpcoming: boolean;
}

function groupByMatchday(matches: ScheduleMatch[]): MatchGroup[] {
  const batchSize = 8;
  const groups: MatchGroup[] = [];

  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize);
    const groupIdx = Math.floor(i / batchSize) + 1;
    const dates = batch
      .map((m) => parseMatchDate(m.date))
      .filter(Boolean) as Date[];
    const completed = batch.filter((m) => m.result !== "-:-").length;
    const hasUpcoming = batch.some((m) => m.result === "-:-");

    let dateRange = "";
    if (dates.length > 0) {
      const first = dates[0];
      const last = dates[dates.length - 1];
      const fmt = (d: Date) =>
        d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      dateRange =
        first.toDateString() === last.toDateString()
          ? fmt(first)
          : `${fmt(first)} – ${fmt(last)}`;
    }

    groups.push({
      label: `Matchday ${groupIdx}`,
      dateRange,
      matches: batch,
      completedCount: completed,
      isUpcoming: hasUpcoming && completed < batch.length,
    });
  }

  return groups;
}

function MatchRow({ match }: { match: ScheduleMatch }) {
  const played = match.result !== "-:-";

  return (
    <div className="flex items-center text-sm py-2 px-3 gap-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground w-24 shrink-0 hidden sm:inline">
        {match.date}
      </span>
      <span className="flex-1 text-right truncate font-medium text-xs sm:text-sm">
        {match.home}
      </span>
      <span
        className={cn(
          "w-14 text-center font-mono text-xs px-1",
          played ? "font-bold" : "text-muted-foreground"
        )}
      >
        {played ? match.result : "vs"}
      </span>
      <span className="flex-1 truncate font-medium text-xs sm:text-sm">
        {match.away}
      </span>
    </div>
  );
}

export function ScheduleList({ matches }: { matches: ScheduleMatch[] }) {
  const groups = useMemo(() => groupByMatchday(matches), [matches]);

  const firstUpcomingIdx = groups.findIndex((g) => g.isUpcoming);
  const [openGroups, setOpenGroups] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (firstUpcomingIdx >= 0) initial.add(firstUpcomingIdx);
    else if (groups.length > 0) initial.add(groups.length - 1);
    return initial;
  });

  const toggle = (idx: number) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No matches found.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group, i) => {
        const isOpen = openGroups.has(i);
        return (
          <Card key={i} className="overflow-hidden">
            <button
              onClick={() => toggle(i)}
              className={cn(
                "w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-muted/30",
                group.isUpcoming && "bg-primary/5"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm">{group.label}</span>
                {group.dateRange && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {group.dateRange}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {group.completedCount}/{group.matches.length} played
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border">
                    {group.matches.map((m, j) => (
                      <MatchRow key={j} match={m} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}
