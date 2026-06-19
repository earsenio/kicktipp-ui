// Infinite-scroll predictions page. Loads matchdays on demand as the user
// scrolls, tracks which section is in view to highlight the active matchday pill,
// and batches all modified bets into a single submit action per matchday.
"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { cn, isDeadlinePassed, getMatchStatus, hasResult } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { MatchCardBet } from "@/components/match/match-card";
import { MatchCardSkeletonGrid } from "@/components/shared/loading-skeleton";
import { Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BetsResponse, MatchdayPredictionsResponse } from "@/lib/types";
import { parseScore } from "@/lib/utils";
import { useMatchdayContext } from "@/components/match/matchday-context";
import Link from "next/link";

interface BetState {
  home: number | null;
  away: number | null;
  originalHome: number | null;
  originalAway: number | null;
  saved: boolean;
}

interface PredictViewProps {
  // Today mode: reuse the Predict view but show only games happening today
  // (still fully editable). Disables the season-scroll machinery and pills.
  todayOnly?: boolean;
}

export function PredictView({ todayOnly = false }: PredictViewProps) {
  const { setShowPills, setActiveMatchday, setMaxMatchday, setOnPillClick } = useMatchdayContext();

  const [matchdayData, setMatchdayData] = useState<Map<number, BetsResponse>>(new Map());
  // Per matchday, the current user's real earned points keyed by match index, from
  // get_matchday_predictions (the same source as the all-players sheet).
  const [pointsByMd, setPointsByMd] = useState<Map<number, Record<number, number | null>>>(new Map());
  // In today mode, the set of "home|away" keys for matches happening today, from
  // get_today_matches (keeps the site-timezone "today" logic server-side). null
  // until loaded so we can distinguish "loading" from "no games today".
  const [todayKeys, setTodayKeys] = useState<Set<string> | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);
  // True while the in-flight load is an upward (previous matchday) load, so we can
  // show the loading skeleton above the list instead of below it.
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [bets, setBets] = useState<Map<number, Record<number, BetState>>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  // After the initial matchday loads, scroll to its next predictable game.
  const [pendingScrollMd, setPendingScrollMd] = useState<number | null>(null);

  const loadedRef = useRef<Set<number>>(new Set());
  // Matchdays whose points we've lazily fetched at least once (the live tick refetches).
  const pointsLoadedRef = useRef<Set<number>>(new Set());
  const loadingRef = useRef(false);
  const maxMdRef = useRef(34);
  const sectionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didInitRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  // Set once the initial scroll-to-current-matchday settles, so the top sentinel
  // doesn't auto-load earlier matchdays during the mount/scroll window. State (not
  // a ref) so flipping it re-attaches the top observer, forcing it to re-evaluate
  // the sentinel's current visibility — needed when the page opens clamped at the
  // top (the sentinel is already in view and would never emit a fresh event).
  const [allowPrevLoad, setAllowPrevLoad] = useState(false);
  // Captured before a previous-matchday prepend so we can re-anchor the viewport
  // to the section that was first on screen (avoids a content jump).
  const prevAnchorRef = useRef<{ md: number; top: number } | null>(null);

  // Loads a matchday's bets. With no `md`, fetches the kicktipp default page (the
  // current matchday) and keys the result by the `currentMatchday` it reports.
  // Returns the resolved matchday number (or null on failure).
  const fetchMatchday = useCallback(async (md?: number): Promise<number | null> => {
    if (md != null && loadedRef.current.has(md)) return md;
    if (md != null && md > maxMdRef.current) return null;
    if (loadingRef.current) return null;

    loadingRef.current = true;
    setLoadingNext(true);
    try {
      const res = await apiFetch("/api/kicktipp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "get_bets", args: md != null ? { matchday: md } : undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");

      const data = json.data as BetsResponse;
      const resolvedMd = md ?? data.currentMatchday ?? 1;

      if (data.maxMatchday && data.maxMatchday > 0) {
        maxMdRef.current = data.maxMatchday;
        setMaxMatchday(data.maxMatchday);
      }

      if (loadedRef.current.has(resolvedMd)) return resolvedMd;
      loadedRef.current.add(resolvedMd);
      setMatchdayData((prev) => new Map(prev).set(resolvedMd, data));

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
      setBets((prev) => new Map(prev).set(resolvedMd, initial));
      return resolvedMd;
    } catch (err) {
      if (md == null || md === 1) {
        setInitialError(err instanceof Error ? err.message : "Failed to load");
      }
      return null;
    } finally {
      loadingRef.current = false;
      setLoadingNext(false);
      // Always clear the upward-load flag when any fetch settles; it's only ever
      // set during a previous-matchday load, so this is a no-op otherwise.
      setLoadingPrev(false);
    }
  }, [setMaxMatchday]);

  // Fetch the current user's real per-match points for a matchday from the
  // leaderboard scrape (same source as the all-players sheet) and store them by
  // match index. Used to show accurate points on each card.
  // `myTips` are the user's own tips for the matchday (by match index, null where
  // not tipped) — used to locate the user's row when the server flag is unset.
  const fetchPoints = useCallback(async (md: number, myTips: Array<string | null>) => {
    try {
      const res = await apiFetch("/api/kicktipp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "get_matchday_predictions", args: { matchday: md } }),
      });
      const json = await res.json();
      if (!res.ok) return;
      const data = json.data as MatchdayPredictionsResponse;

      // Prefer the server's current-player flag; fall back to matching the user's
      // own tips (their bets uniquely identify their row), since session.player is
      // often unset. The fallback is safe: ambiguous → no match → grade-word chip.
      let me = data.players.find((p) => p.isCurrentPlayer);
      if (!me) {
        // Match only on tips that are VISIBLE on the leaderboard — on the current
        // matchday, not-yet-started games hide every player's tip (including the
        // user's own row), so requiring all tips to match would never identify us.
        // Pick the row that agrees with the user's bets on the most visible games
        // with zero disagreements; require a unique maximum (else stay unidentified).
        const tipped = myTips.map((t, i) => (t != null ? i : -1)).filter((i) => i >= 0);
        if (tipped.length > 0) {
          let best: typeof data.players[number] | null = null;
          let bestAgree = 0;
          let tie = false;
          for (const p of data.players) {
            let agree = 0;
            let disagree = 0;
            for (const i of tipped) {
              const t = p.predictions[i]?.tip;
              if (t == null) continue; // hidden for this player — ignore
              if (t === myTips[i]) agree++;
              else { disagree++; break; }
            }
            if (disagree > 0 || agree === 0) continue;
            if (agree > bestAgree) { best = p; bestAgree = agree; tie = false; }
            else if (agree === bestAgree) { tie = true; }
          }
          if (best && !tie) me = best;
        }
      }
      if (!me) return;

      // The row is identified, so a null points cell means "graded, no points badge"
      // (kicktipp omits the <sub> for 0-point tips) → treat as 0, matching the sheet.
      const map: Record<number, number | null> = {};
      me.predictions.forEach((p, i) => { map[i] = p.points ?? 0; });
      setPointsByMd((prev) => new Map(prev).set(md, map));
    } catch {
      // Ignore — cards fall back to the grade word until points load.
    }
  }, []);

  // Today mode: load the set of matches happening today (by "home|away" key) so we
  // can filter the current matchday's matches down to today's games.
  useEffect(() => {
    if (!todayOnly) return;
    (async () => {
      try {
        const res = await apiFetch("/api/kicktipp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "get_today_matches" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Request failed");
        const data = json.data as { matches: Array<{ home: string; away: string }> };
        setTodayKeys(new Set(data.matches.map((m) => `${m.home}|${m.away}`)));
      } catch {
        setTodayKeys(new Set());
      }
    })();
  }, [todayOnly]);

  // On mount: enable pills and open on the current matchday, then scroll to its
  // next predictable game (handled by the pendingScroll effect below). In today
  // mode we skip pills and the scroll-to-upcoming (the list is a single filtered day).
  useEffect(() => {
    if (!todayOnly) setShowPills(true);
    if (!didInitRef.current) {
      didInitRef.current = true;
      (async () => {
        const md = await fetchMatchday();
        if (md != null) {
          setActiveMatchday(md);
          if (!todayOnly) setPendingScrollMd(md);
        }
      })();
    }
    return () => setShowPills(false);
  }, [setShowPills, fetchMatchday, setActiveMatchday, todayOnly]);

  // Once the initial matchday's data has rendered, scroll to the next predictable
  // game (earliest "upcoming" match); fall back to the matchday section header.
  useEffect(() => {
    if (pendingScrollMd == null) return;
    const data = matchdayData.get(pendingScrollMd);
    if (!data) return;
    const idx = data.matches.findIndex(
      (m) => getMatchStatus(m.kickoff, m.result, m.ended) === "upcoming"
    );
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const matchEl = idx >= 0 ? matchRefs.current.get(`${pendingScrollMd}-${idx}`) : null;
        // Use an instant (non-smooth) jump for the on-load positioning: it lands
        // synchronously, so by the time we flip allowPrevLoad below the viewport is
        // already correct and the previous-matchday prepend anchors against it. A
        // smooth animation would still be running and the prepend would fight it.
        if (matchEl) {
          matchEl.scrollIntoView({ behavior: "auto", block: "center" });
        } else {
          sectionRefs.current.get(pendingScrollMd)?.scrollIntoView({ behavior: "auto", block: "start" });
        }
        setPendingScrollMd(null);
        // Initial scroll done — now allow scroll-up to load earlier matchdays.
        setAllowPrevLoad(true);
      })
    );
    return () => cancelAnimationFrame(raf);
  }, [pendingScrollMd, matchdayData]);

  // Register pill click handler (no pills in today mode)
  useEffect(() => {
    if (todayOnly) return;
    const handler = (md: number) => {
      setActiveMatchday(md);
      const el = sectionRefs.current.get(md);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Load just that matchday (works in both directions since we may start
      // mid-season), then scroll once it has rendered.
      (async () => {
        await fetchMatchday(md);
        requestAnimationFrame(() => {
          sectionRefs.current.get(md)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      })();
    };
    setOnPillClick(() => handler);
    return () => setOnPillClick(null);
  }, [setOnPillClick, setActiveMatchday, fetchMatchday, todayOnly]);

  // Infinite scroll: load the next matchday when the sentinel enters the viewport
  // (300px early, so content loads before the user reaches the bottom). Disabled in
  // today mode (single filtered day, no season scrolling).
  useEffect(() => {
    if (todayOnly) return;
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
  }, [fetchMatchday, matchdayData.size, todayOnly]);

  // Infinite scroll (upward): load the previous matchday when the top sentinel
  // enters view. Gated until the initial scroll settles so we don't auto-load
  // earlier matchdays on mount. Before fetching we capture the first section's
  // on-screen position so the anchoring effect below can keep the view stable.
  // Disabled in today mode.
  useEffect(() => {
    if (todayOnly) return;
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (!allowPrevLoad) return;
        const loaded = Array.from(loadedRef.current);
        const minLoaded = loaded.length ? Math.min(...loaded) : 1;
        if (minLoaded <= 1) return;
        const anchorEl = sectionRefs.current.get(minLoaded);
        if (anchorEl) {
          prevAnchorRef.current = { md: minLoaded, top: anchorEl.getBoundingClientRect().top };
        }
        setLoadingPrev(true);
        fetchMatchday(minLoaded - 1);
      },
      { rootMargin: "400px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMatchday, matchdayData.size, allowPrevLoad, todayOnly]);

  // While an upward load is in progress, keep the viewport pinned to the section
  // that was first on screen when the load began. This runs before paint on every
  // layout change in the sequence — the top skeleton appearing, the previous
  // matchday prepending, and the skeleton disappearing — so none of them push the
  // view down. We hold the anchor until the load settles, then release it.
  useLayoutEffect(() => {
    const anchor = prevAnchorRef.current;
    if (!anchor) return;
    const el = sectionRefs.current.get(anchor.md);
    if (el) {
      const delta = el.getBoundingClientRect().top - anchor.top;
      if (delta !== 0) window.scrollBy({ top: delta, behavior: "instant" });
    }
    if (!loadingPrev) prevAnchorRef.current = null;
  }, [matchdayData, loadingPrev]);

  // Track which section is in view to highlight the active matchday pill.
  // rootMargin -30%/-70% means "active" = the section crossing the top 30% of the viewport.
  // No pills in today mode, so skip.
  useEffect(() => {
    if (todayOnly) return;
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
  }, [setActiveMatchday, matchdayData.size, todayOnly]);

  // MD 1's section header sits above the IntersectionObserver's trigger zone,
  // so scrolling back to the top never fires an intersection for it.
  useEffect(() => {
    if (todayOnly) return;
    const onScroll = () => {
      if (window.scrollY < 150) {
        const keys = Array.from(matchdayData.keys());
        const first = keys.length ? Math.min(...keys) : null;
        if (first) setActiveMatchday(first);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setActiveMatchday, matchdayData.size, todayOnly]);

  // ── Live score polling ──────────────────────────────────────────────────
  // A single 60s timer (component lifetime) refreshes any loaded matchday that
  // contains a match currently in play. It writes ONLY the `result` field back
  // into matchdayData — the user's editable predictions in `bets` are never
  // touched, so unsaved scores survive a refresh. When nothing is live the tick
  // makes zero network calls. Latest matchdayData is read from a ref so the
  // interval can stay stable for the component's lifetime.
  const matchdayDataRef = useRef(matchdayData);
  useEffect(() => { matchdayDataRef.current = matchdayData; }, [matchdayData]);

  useEffect(() => {
    const tick = async () => {
      for (const [md, data] of matchdayDataRef.current) {
        const hasLive = data.matches.some((m) => getMatchStatus(m.kickoff, m.result, m.ended) === "live");
        if (!hasLive) continue;
        try {
          const res = await apiFetch("/api/kicktipp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tool: "get_bets", args: { matchday: md }, skipCache: true }),
          });
          if (!res.ok) continue;
          const json = await res.json();
          const fresh = json.data as BetsResponse;
          setMatchdayData((prev) => {
            const old = prev.get(md);
            // Bail if the matchday vanished or the row count changed (postponement
            // etc.) so index-based merging can never misalign results with matches.
            if (!old || old.matches.length !== fresh.matches.length) return prev;
            const merged = old.matches.map((m, i) => ({ ...m, result: fresh.matches[i].result, ended: fresh.matches[i].ended }));
            return new Map(prev).set(md, { ...old, matches: merged });
          });
          // Keep the card's points in sync with the live result.
          fetchPoints(md, data.matches.map((m) => (parseScore((m.bet ?? "").trim()) ? m.bet.trim() : null)));
        } catch {
          // Ignore transient polling errors; the next tick retries.
        }
      }
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [fetchPoints]);

  // Lazily load the current user's points for any matchday that has results,
  // once per matchday (the live tick above refreshes live ones).
  useEffect(() => {
    for (const [md, data] of matchdayData) {
      if (pointsLoadedRef.current.has(md)) continue;
      if (!data.matches.some((m) => hasResult(m.result))) continue;
      pointsLoadedRef.current.add(md);
      // fetchPoints sets state asynchronously (after the network round-trip), so this
      // isn't a synchronous setState-in-effect cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPoints(md, data.matches.map((m) => (parseScore((m.bet ?? "").trim()) ? m.bet.trim() : null)));
    }
  }, [matchdayData, fetchPoints]);

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

  // In today mode we also need the today set before we can render the filtered list.
  if (loadedMatchdays.length === 0 || (todayOnly && todayKeys === null)) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <MatchCardSkeletonGrid count={6} />
      </div>
    );
  }

  // Today mode: a match is shown only if it kicks off today (by "home|away" key).
  const isTodayMatch = (m: { home: string; away: string }) =>
    !todayOnly || (todayKeys?.has(`${m.home}|${m.away}`) ?? false);

  // Today mode has no games today → friendly empty state.
  if (
    todayOnly &&
    !loadedMatchdays.some((md) => matchdayData.get(md)!.matches.some(isTodayMatch))
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-4xl mx-auto">
        <h2 className="text-lg font-bold mb-2">No matches today</h2>
        <p className="text-sm text-muted-foreground mb-4">
          There are no matches scheduled for today. Head to your predictions.
        </p>
        <Link
          href="/predict"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
        >
          View Predictions
        </Link>
      </div>
    );
  }

  // Count missing predictions among the matches actually shown.
  const shownMissingCount = todayOnly
    ? loadedMatchdays.reduce((acc, md) => {
        const mdBets = bets.get(md) || {};
        return (
          acc +
          matchdayData.get(md)!.matches.filter((m, i) => {
            const bet = mdBets[i];
            return isTodayMatch(m) && bet && (bet.home === null || bet.away === null);
          }).length
        );
      }, 0)
    : missingCount;

  let globalIndex = 0;

  return (
    <div className="-m-4 md:-m-6">
      {/* Header. In predict mode the fixed top bar also carries the matchday pills
          row (~3rem) below the 56px header, which the layout's pt-14 doesn't reserve
          space for — add top padding so the title clears the pills. Today mode has no
          pills, so it keeps the default spacing. */}
      <div
        className={cn(
          "px-4 pb-2 flex items-center justify-between",
          todayOnly ? "pt-4" : "pt-[3.75rem]"
        )}
      >
        <h1 className="text-2xl font-extrabold tracking-tight">
          {todayOnly ? "Today" : "All Predictions"}
        </h1>
        {shownMissingCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            {shownMissingCount} missing
          </span>
        )}
      </div>

      {/* Matchday sections (bottom padding clears the submit bar + tab bar) */}
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+8.5rem)] md:pb-20">
        {/* Sentinel for infinite scroll upward (load previous matchday) */}
        <div ref={topSentinelRef} className="h-1" />

        {loadingPrev && (
          <div className="py-4">
            <MatchCardSkeletonGrid count={3} />
          </div>
        )}

        {loadedMatchdays.map((md) => {
          const data = matchdayData.get(md)!;
          const mdBets = bets.get(md) || {};
          const startIndex = globalIndex;
          globalIndex += data.matches.length;

          return (
            <div key={md} className="mb-6">
              {!todayOnly && (
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
              )}

              <div className="flex flex-col gap-2.5">
                {data.matches.map((match, i) => {
                  const bet = mdBets[i];
                  if (!bet) return null;
                  if (!isTodayMatch(match)) return null;
                  const modified = bet.home !== bet.originalHome || bet.away !== bet.originalAway;

                  return (
                    <motion.div
                      key={`${md}-${match.home}-${match.away}-${i}`}
                      ref={(el) => { if (el) matchRefs.current.set(`${md}-${i}`, el); }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                    >
                      <MatchCardBet
                        match={match}
                        betState={{ home: bet.home, away: bet.away, saved: bet.saved, modified }}
                        onBetChange={(field, val) => updateBet(md, i, field, val)}
                        index={startIndex + i}
                        matchday={md}
                        matchIndex={i}
                        points={pointsByMd.get(md)?.[i] ?? null}
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

      {/* Floating submit bar — sits flush on top of the mobile tab bar (row 52px + its 0.5rem bottom padding) */}
      <div className="fixed bottom-[calc(52px+env(safe-area-inset-bottom)+0.5rem)] md:bottom-0 left-0 right-0 md:left-56 z-40 px-4 py-2.5 glass-nav border-t border-border">
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
