// Infinite-scroll predictions page. Loads matchdays on demand as the user
// scrolls, tracks which section is in view to highlight the active matchday pill,
// and batches all modified bets into a single submit action per matchday.
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { cn, isDeadlinePassed } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { MatchCardBet } from "@/components/match/match-card";
import { MatchCardSkeletonGrid } from "@/components/shared/loading-skeleton";
import { Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BetsResponse } from "@/lib/types";
import { parseScore } from "@/lib/utils";
import { useMatchdayContext } from "@/components/match/matchday-context";

interface BetState {
  home: number | null;
  away: number | null;
  originalHome: number | null;
  originalAway: number | null;
  saved: boolean;
}

export function PredictView() {
  const { setShowPills, setActiveMatchday, setMaxMatchday, setOnPillClick } = useMatchdayContext();

  const [matchdayData, setMatchdayData] = useState<Map<number, BetsResponse>>(new Map());
  const [loadingNext, setLoadingNext] = useState(false);
  const [bets, setBets] = useState<Map<number, Record<number, BetState>>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);

  const loadedRef = useRef<Set<number>>(new Set());
  const loadingRef = useRef(false);
  const maxMdRef = useRef(34);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchMatchday = useCallback(async (md: number) => {
    if (loadedRef.current.has(md) || loadingRef.current) return;
    if (md > maxMdRef.current) return;

    loadingRef.current = true;
    setLoadingNext(true);
    try {
      const res = await apiFetch("/api/kicktipp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "get_bets", args: { matchday: md } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");

      const data = json.data as BetsResponse;

      if (data.maxMatchday && data.maxMatchday > 0) {
        maxMdRef.current = data.maxMatchday;
        setMaxMatchday(data.maxMatchday);
      }

      loadedRef.current.add(md);
      setMatchdayData((prev) => new Map(prev).set(md, data));

      const initial: Record<number, BetState> = {};
      data.matches.forEach((match, i) => {
        const parsed = parseScore(match.bet);
        initial[i] = {
          home: parsed?.home ?? null,
          away: parsed?.away ?? null,
          originalHome: parsed?.home ?? null,
          originalAway: parsed?.away ?? null,
          saved: false,
        };
      });
      setBets((prev) => new Map(prev).set(md, initial));
    } catch (err) {
      if (md === 1) {
        setInitialError(err instanceof Error ? err.message : "Failed to load");
      }
    } finally {
      loadingRef.current = false;
      setLoadingNext(false);
    }
  }, [setMaxMatchday]);

  // Load MD 1 on mount + enable pills in header
  useEffect(() => {
    setShowPills(true);
    fetchMatchday(1);
    return () => setShowPills(false);
  }, [setShowPills, fetchMatchday]);

  // Register pill click handler
  useEffect(() => {
    const handler = (md: number) => {
      setActiveMatchday(md);
      const el = sectionRefs.current.get(md);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Load up to that matchday, then scroll
      const loadAndScroll = async () => {
        const loaded = Array.from(loadedRef.current);
        const maxLoaded = loaded.length ? Math.max(...loaded) : 0;
        for (let i = maxLoaded + 1; i <= md; i++) {
          await fetchMatchday(i);
        }
        requestAnimationFrame(() => {
          const target = sectionRefs.current.get(md);
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      };
      loadAndScroll();
    };
    setOnPillClick(() => handler);
    return () => setOnPillClick(null);
  }, [setOnPillClick, setActiveMatchday, fetchMatchday]);

  // Infinite scroll: load the next matchday when the sentinel enters the viewport
  // (300px early, so content loads before the user reaches the bottom).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        const loaded = Array.from(loadedRef.current);
        const maxLoaded = loaded.length ? Math.max(...loaded) : 0;
        const next = maxLoaded + 1;
        if (next <= maxMdRef.current) {
          fetchMatchday(next);
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMatchday, matchdayData.size]);

  // Track which section is in view to highlight the active matchday pill.
  // rootMargin -30%/-70% means "active" = the section crossing the top 30% of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const md = parseInt(entry.target.getAttribute("data-matchday") || "1", 10);
            setActiveMatchday(md);
          }
        }
      },
      { rootMargin: "-30% 0px -70% 0px" }
    );

    for (const el of sectionRefs.current.values()) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [setActiveMatchday, matchdayData.size]);

  // MD 1's section header sits above the IntersectionObserver's trigger zone,
  // so scrolling back to the top never fires an intersection for it.
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < 150) {
        const keys = Array.from(matchdayData.keys());
        const first = keys.length ? Math.min(...keys) : null;
        if (first) setActiveMatchday(first);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setActiveMatchday, matchdayData.size]);

  const updateBet = useCallback((md: number, index: number, field: "home" | "away", value: number | null) => {
    setBets((prev) => {
      const next = new Map(prev);
      const mdBets = { ...next.get(md)! };
      mdBets[index] = { ...mdBets[index], [field]: value, saved: false };
      next.set(md, mdBets);
      return next;
    });
  }, []);

  const modifiedBets = useMemo(() => {
    const result: Array<{ matchday: number; index: number; bet: BetState }> = [];
    for (const [md, mdBets] of bets) {
      for (const [indexStr, bet] of Object.entries(mdBets)) {
        const modified = bet.home !== bet.originalHome || bet.away !== bet.originalAway;
        const complete = bet.home !== null && bet.away !== null;
        const kickoff = matchdayData.get(md)?.matches[Number(indexStr)]?.kickoff;
        const locked = kickoff ? isDeadlinePassed(kickoff) : false;
        if (modified && complete && !locked) {
          result.push({ matchday: md, index: Number(indexStr), bet });
        }
      }
    }
    return result;
  }, [bets, matchdayData]);

  const pendingCount = modifiedBets.length;

  const missingCount = useMemo(() => {
    let count = 0;
    for (const mdBets of bets.values()) {
      for (const bet of Object.values(mdBets)) {
        if (bet.home === null || bet.away === null) count++;
      }
    }
    return count;
  }, [bets]);

  const handleSubmit = async () => {
    if (pendingCount === 0) return;
    setSubmitting(true);

    const byMatchday = new Map<number, Array<{ index: number; bet: BetState }>>();
    for (const entry of modifiedBets) {
      if (!byMatchday.has(entry.matchday)) byMatchday.set(entry.matchday, []);
      byMatchday.get(entry.matchday)!.push(entry);
    }

    let totalSaved = 0;
    for (const [md, entries] of byMatchday) {
      const mdData = matchdayData.get(md);
      if (!mdData) continue;

      const betStrings = entries.map(({ index, bet }) => {
        const match = mdData.matches[index];
        return `${match.home} vs ${match.away}=${bet.home}:${bet.away}`;
      });

      try {
        const res = await apiFetch("/api/kicktipp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "place_bets",
            args: { bets: betStrings, matchday: md },
            skipCache: true,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to place bets");

        setBets((prev) => {
          const next = new Map(prev);
          const mdBets = { ...next.get(md)! };
          for (const { index } of entries) {
            mdBets[index] = {
              ...mdBets[index],
              originalHome: mdBets[index].home,
              originalAway: mdBets[index].away,
              saved: true,
            };
          }
          next.set(md, mdBets);
          return next;
        });
        totalSaved += entries.length;
      } catch (err) {
        toast.error(`MD ${md}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }

    if (totalSaved > 0) {
      toast.success(`${totalSaved} prediction${totalSaved > 1 ? "s" : ""} saved`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    }
    setSubmitting(false);
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCount]);

  const loadedMatchdays = Array.from(matchdayData.keys()).sort((a, b) => a - b);

  if (initialError && loadedMatchdays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load predictions</h2>
        <p className="text-sm text-muted-foreground">{initialError}</p>
      </div>
    );
  }

  if (loadedMatchdays.length === 0) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <MatchCardSkeletonGrid count={6} />
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div className="-m-4 md:-m-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Predictions</h1>
        {missingCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            {missingCount} missing
          </span>
        )}
      </div>

      {/* Matchday sections */}
      <div className="px-4 pb-28 md:pb-20">
        {loadedMatchdays.map((md) => {
          const data = matchdayData.get(md)!;
          const mdBets = bets.get(md) || {};
          const startIndex = globalIndex;
          globalIndex += data.matches.length;

          return (
            <div key={md} className="mb-6">
              <div
                ref={(el) => { if (el) sectionRefs.current.set(md, el); }}
                data-matchday={md}
                className="scroll-mt-[120px] py-3 flex items-center gap-3"
              >
                <span className="text-sm font-bold text-primary uppercase tracking-wider">
                  MD {md}
                </span>
                <span className="text-sm text-muted-foreground">{data.title}</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {data.matches.map((match, i) => {
                  const bet = mdBets[i];
                  if (!bet) return null;
                  const modified = bet.home !== bet.originalHome || bet.away !== bet.originalAway;

                  return (
                    <motion.div
                      key={`${md}-${match.home}-${match.away}-${i}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                    >
                      <MatchCardBet
                        match={match}
                        betState={{ home: bet.home, away: bet.away, saved: bet.saved, modified }}
                        onBetChange={(field, val) => updateBet(md, i, field, val)}
                        index={startIndex + i}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {loadingNext && (
          <div className="py-4">
            <MatchCardSkeletonGrid count={3} />
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Floating submit bar */}
      <div className="fixed bottom-[calc(52px+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 md:left-56 z-40 px-4 py-2.5 glass-nav border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={pendingCount === 0 && !submitting}
          className={cn(
            "w-full rounded-xl py-3.5 text-sm font-bold transition-all",
            pendingCount > 0 || submitting
              ? "bg-primary text-primary-foreground cursor-pointer shadow-lg shadow-primary/25"
              : "bg-muted text-muted-foreground cursor-default"
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
