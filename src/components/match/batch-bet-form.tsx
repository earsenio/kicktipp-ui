"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScoreInput } from "@/components/match/score-input";
import { MatchdaySelector } from "@/components/shared/matchday-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, RotateCcw, Eraser, Zap } from "lucide-react";
import type { BetMatch } from "@/lib/types";
import { parseScore } from "@/lib/utils";

interface BetState {
  home: number | null;
  away: number | null;
  originalHome: number | null;
  originalAway: number | null;
  saved: boolean;
}

interface BatchBetFormProps {
  matchday: number;
  title: string;
  matches: BetMatch[];
}

export function BatchBetForm({ matchday, title, matches }: BatchBetFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [bets, setBets] = useState<Record<number, BetState>>({});

  useEffect(() => {
    const initial: Record<number, BetState> = {};
    matches.forEach((match, i) => {
      const parsed = parseScore(match.bet);
      initial[i] = {
        home: parsed?.home ?? null,
        away: parsed?.away ?? null,
        originalHome: parsed?.home ?? null,
        originalAway: parsed?.away ?? null,
        saved: false,
      };
    });
    setBets(initial);
  }, [matches]);

  const updateBet = useCallback((index: number, field: "home" | "away", value: number | null) => {
    setBets((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value, saved: false },
    }));
  }, []);

  const modifiedBets = useMemo(() => {
    return Object.entries(bets).filter(([, bet]) => {
      const modified =
        bet.home !== bet.originalHome || bet.away !== bet.originalAway;
      const complete = bet.home !== null && bet.away !== null;
      return modified && complete;
    });
  }, [bets]);

  const pendingCount = modifiedBets.length;
  const totalBets = matches.length;
  const predictedCount = Object.values(bets).filter(
    (b) => b.home !== null && b.away !== null
  ).length;
  const missingCount = totalBets - predictedCount;

  const handleSubmit = async () => {
    if (pendingCount === 0) return;
    setSubmitting(true);

    const betStrings = modifiedBets.map(([indexStr]) => {
      const i = Number(indexStr);
      const match = matches[i];
      const bet = bets[i];
      return `${match.home} vs ${match.away}=${bet.home}:${bet.away}`;
    });

    try {
      const res = await fetch("/api/kicktipp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "place_bets",
          args: { bets: betStrings, matchday },
          skipCache: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to place bets");

      setBets((prev) => {
        const next = { ...prev };
        modifiedBets.forEach(([indexStr]) => {
          const i = Number(indexStr);
          next[i] = {
            ...next[i],
            originalHome: next[i].home,
            originalAway: next[i].away,
            saved: true,
          };
        });
        return next;
      });

      toast.success(`${pendingCount} prediction${pendingCount > 1 ? "s" : ""} saved`);

      fetch("/api/kicktipp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "get_bets", args: { matchday }, skipCache: true }),
      });
      fetch("/api/kicktipp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "get_today_matches", skipCache: true }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place bets");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setBets((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const i = Number(k);
        next[i] = {
          ...next[i],
          home: next[i].originalHome,
          away: next[i].originalAway,
          saved: false,
        };
      });
      return next;
    });
  };

  const handleClear = () => {
    setBets((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const i = Number(k);
        next[i] = { ...next[i], home: null, away: null, saved: false };
      });
      return next;
    });
  };

  const handleQuickFill = (home: number, away: number) => {
    setBets((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const i = Number(k);
        next[i] = { ...next[i], home, away, saved: false };
      });
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCount]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <MatchdaySelector
          current={matchday}
          onChange={(n) => router.push(`/matchday/${n}`)}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={pendingCount === 0}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Eraser className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleQuickFill(1, 1)}>
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            All 1:1
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleQuickFill(2, 1)}>
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            All 2:1
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {title && <span>{title} · </span>}
        {totalBets} match{totalBets !== 1 ? "es" : ""} · {predictedCount} predicted · {missingCount} missing
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matches.map((match, i) => {
          const bet = bets[i];
          if (!bet) return null;

          const modified =
            bet.home !== bet.originalHome || bet.away !== bet.originalAway;

          return (
            <Card
              key={`${match.home}-${match.away}-${i}`}
              className={cn(
                "p-4 border-2 transition-all",
                bet.saved && "border-accent-green/40",
                modified && !bet.saved && "border-accent-amber/40",
                !modified && !bet.saved && "border-border"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 text-right">
                  <p className="text-sm font-medium truncate">{match.home}</p>
                  <p className="text-[10px] text-muted-foreground">{match.date}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <ScoreInput
                    value={bet.home}
                    onChange={(v) => updateBet(i, "home", v)}
                    modified={modified}
                    saved={bet.saved}
                    tabIndex={i * 2 + 1}
                    aria-label={`${match.home} score`}
                  />
                  <span className="text-lg font-bold text-muted-foreground">:</span>
                  <ScoreInput
                    value={bet.away}
                    onChange={(v) => updateBet(i, "away", v)}
                    modified={modified}
                    saved={bet.saved}
                    tabIndex={i * 2 + 2}
                    aria-label={`${match.away} score`}
                  />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{match.away}</p>
                  {match.odds.home && (
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {match.odds.home} · {match.odds.draw} · {match.odds.away}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {totalBets > 0 && (
        <div className="sticky bottom-16 md:bottom-4 z-30">
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 flex items-center justify-between shadow-lg">
            <span className="text-sm text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} unsaved prediction${pendingCount > 1 ? "s" : ""}`
                : "All changes saved"}
            </span>
            <Button
              onClick={handleSubmit}
              disabled={pendingCount === 0 || submitting}
              className="min-w-[180px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : pendingCount > 0 ? (
                `Submit ${pendingCount} prediction${pendingCount > 1 ? "s" : ""}`
              ) : (
                "All saved"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
