"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, API_BASE } from "@/lib/utils";
import { MatchCardBet } from "@/components/match/match-card";
import { MatchdayPills } from "@/components/shared/matchday-pills";
import { Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [justSaved, setJustSaved] = useState(false);
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
  const missingCount = Object.values(bets).filter(
    (b) => b.home === null || b.away === null
  ).length;

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
      const res = await fetch(`${API_BASE}/api/kicktipp`, {
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
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);

      fetch(`${API_BASE}/api/kicktipp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "get_bets", args: { matchday }, skipCache: true }),
      });
      fetch(`${API_BASE}/api/kicktipp`, {
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
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Header */}
      <div className="px-4 pt-3 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Predictions</h1>
          <p className="text-xs text-white/40 mt-0.5">{title || `Matchday ${matchday}`}</p>
        </div>
        {missingCount > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/[0.12] text-amber-500">
            {missingCount} missing
          </span>
        )}
      </div>

      {/* Matchday pills */}
      <MatchdayPills
        current={matchday}
        onChange={(n) => router.push(`/matchday/${n}`)}
      />

      {/* Match cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-2.5 scrollbar-hide">
        {matches.map((match, i) => {
          const bet = bets[i];
          if (!bet) return null;
          const modified =
            bet.home !== bet.originalHome || bet.away !== bet.originalAway;

          return (
            <motion.div
              key={`${match.home}-${match.away}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <MatchCardBet
                match={match}
                betState={{
                  home: bet.home,
                  away: bet.away,
                  saved: bet.saved,
                  modified,
                }}
                onBetChange={(field, val) => updateBet(i, field, val)}
                index={i}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Submit bar */}
      <div className="px-4 py-2.5 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={pendingCount === 0 && !submitting}
          className={cn(
            "w-full rounded-xl py-3.5 text-sm font-bold transition-all",
            pendingCount > 0 || submitting
              ? "bg-primary text-white cursor-pointer"
              : "bg-white/[0.06] text-white/25 cursor-default"
          )}
        >
          <AnimatePresence mode="wait">
            {submitting ? (
              <motion.span
                key="submitting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </motion.span>
            ) : justSaved ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Saved!
              </motion.span>
            ) : pendingCount > 0 ? (
              <motion.span
                key={`submit-${pendingCount}`}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                Submit {pendingCount} Prediction{pendingCount > 1 ? "s" : ""}
              </motion.span>
            ) : (
              <motion.span key="allsaved">All Predictions Saved</motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
