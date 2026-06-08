"use client";

import { cn } from "@/lib/utils";
import type { TodayMatch, BetMatch } from "@/lib/types";
import { ScoreInput } from "@/components/match/score-input";
import { CountryFlag } from "@/components/shared/country-flag";

type ResultType = "correct" | "tendency" | "wrong";

function getResultType(
  betHome: number | null,
  betAway: number | null,
  result: string | null | undefined
): ResultType | null {
  if (!result || result === "-:-" || betHome === null || betAway === null) return null;
  const parts = result.split(":");
  if (parts.length !== 2) return null;
  const rh = parseInt(parts[0], 10);
  const ra = parseInt(parts[1], 10);
  if (isNaN(rh) || isNaN(ra)) return null;
  if (betHome === rh && betAway === ra) return "correct";
  if (Math.sign(betHome - betAway) === Math.sign(rh - ra)) return "tendency";
  return "wrong";
}

function parseResult(result: string): [number, number] | null {
  const parts = result.split(":");
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const a = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(a)) return null;
  return [h, a];
}

interface BetState {
  home: number | null;
  away: number | null;
  saved: boolean;
  modified: boolean;
}

interface MatchCardBetProps {
  match: BetMatch & { result?: string };
  betState: BetState;
  onBetChange: (field: "home" | "away", value: number | null) => void;
  index: number;
}

export function MatchCardBet({ match, betState, onBetChange, index }: MatchCardBetProps) {
  const isFinished = !!match.result && match.result !== "-:-";
  const hasBet = betState.home !== null && betState.away !== null;
  const resultType = isFinished && hasBet ? getResultType(betState.home, betState.away, match.result) : null;
  const homeWins = hasBet && !isFinished && betState.home! > betState.away!;
  const awayWins = hasBet && !isFinished && betState.away! > betState.home!;
  const needsBet = !hasBet && !isFinished;

  let cardState = "default";
  if (isFinished && resultType === "correct") cardState = "finished_correct";
  else if (isFinished && resultType === "tendency") cardState = "finished_tendency";
  else if (isFinished) cardState = "finished_wrong";
  else if (needsBet) cardState = "needs_bet";
  else if (hasBet && betState.saved) cardState = "saved";

  const parsed = isFinished ? parseResult(match.result!) : null;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-3 shrink-0 transition-all border-[1.5px]",
        cardState === "needs_bet" && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-amber-500/40",
        cardState === "saved" && "bg-green-500/[0.04] dark:bg-green-500/[0.06] border-green-500/30",
        cardState === "finished_correct" && "bg-green-500/[0.06] dark:bg-green-500/[0.08] border-green-500/40",
        cardState === "finished_tendency" && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-amber-500/30",
        cardState === "finished_wrong" && "bg-red-500/[0.04] dark:bg-red-500/[0.06] border-red-500/25",
        cardState === "default" && "bg-card border-border"
      )}
    >
      {/* Date — prominent */}
      <div className="flex items-center justify-center gap-2">
        <span className={cn(
          "text-sm font-semibold px-2.5 py-0.5 rounded-lg",
          isFinished
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary dark:bg-primary/20"
        )}>
          {isFinished ? "FT" : match.date}
        </span>
        {!isFinished && hasBet && betState.saved && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-500/15 text-green-600 dark:text-green-400">
            saved
          </span>
        )}
        {!isFinished && hasBet && betState.modified && !betState.saved && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            unsaved
          </span>
        )}
        {needsBet && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            needs bet
          </span>
        )}
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <CountryFlag country={match.home} size={20} className="shrink-0" />
          <span
            className={cn(
              "text-base truncate transition-all",
              homeWins ? "font-extrabold text-foreground" : isFinished ? "text-muted-foreground" : "font-medium text-foreground/80"
            )}
          >
            {match.home}
          </span>
        </div>
        <span className="text-xs font-bold text-muted-foreground/50 shrink-0">vs</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-base truncate transition-all",
              awayWins ? "font-extrabold text-foreground" : isFinished ? "text-muted-foreground" : "font-medium text-foreground/80"
            )}
          >
            {match.away}
          </span>
          <CountryFlag country={match.away} size={20} className="shrink-0" />
        </div>
      </div>

      {/* Score inputs */}
      <div className="flex items-center justify-center gap-2">
        <ScoreInput
          value={betState.home}
          onChange={(v) => onBetChange("home", v)}
          modified={betState.modified}
          saved={betState.saved}
          isFinished={isFinished}
          tabIndex={index * 2 + 1}
          aria-label={`${match.home} score`}
        />
        <span className="text-2xl font-extrabold text-muted-foreground/40 px-1">:</span>
        <ScoreInput
          value={betState.away}
          onChange={(v) => onBetChange("away", v)}
          modified={betState.modified}
          saved={betState.saved}
          isFinished={isFinished}
          tabIndex={index * 2 + 2}
          aria-label={`${match.away} score`}
        />
      </div>

      {/* Result display for finished matches */}
      {isFinished && parsed && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Final Result
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono text-3xl font-extrabold",
                parsed[0] > parsed[1] ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {parsed[0]}
            </span>
            <span className="text-2xl font-extrabold text-muted-foreground/40">:</span>
            <span
              className={cn(
                "font-mono text-3xl font-extrabold",
                parsed[1] > parsed[0] ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {parsed[1]}
            </span>
          </div>
          {resultType && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-bold px-3 py-1 rounded-lg",
                  resultType === "correct" && "bg-green-500/15 text-green-600 dark:text-green-400",
                  resultType === "tendency" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  resultType === "wrong" && "bg-red-500/15 text-red-600 dark:text-red-400"
                )}
              >
                {resultType === "correct" ? "Exact" : resultType === "tendency" ? "~ Tendency" : "Wrong"}
              </span>
              {resultType !== "wrong" && (
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    resultType === "correct" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  +{resultType === "correct" ? "4" : "2"} pts
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Odds row */}
      {match.odds.home && !isFinished && (
        <div className="flex items-center justify-center gap-2">
          <span className="px-2 py-1 rounded-md bg-muted font-mono text-xs text-muted-foreground border border-border">
            H {match.odds.home}
          </span>
          <span className="px-2 py-1 rounded-md bg-muted font-mono text-xs text-muted-foreground border border-border">
            D {match.odds.draw}
          </span>
          <span className="px-2 py-1 rounded-md bg-muted font-mono text-xs text-muted-foreground border border-border">
            A {match.odds.away}
          </span>
        </div>
      )}
    </div>
  );
}

interface MatchCardProps {
  match: TodayMatch;
}

export function MatchCard({ match }: MatchCardProps) {
  const hasBet = match.bet && match.bet !== "-" && match.bet !== "";
  const needsBet = match.needsBet;

  return (
    <div
      role="article"
      aria-label={`${match.home} vs ${match.away}, kickoff ${match.time}`}
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-3 transition-all border-[1.5px]",
        needsBet && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-amber-500/40",
        hasBet && !needsBet && "bg-green-500/[0.04] dark:bg-green-500/[0.06] border-green-500/30",
        !hasBet && !needsBet && "bg-card border-border"
      )}
    >
      {/* Date — prominent */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
          {match.time}
        </span>
        {hasBet && !needsBet && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-500/15 text-green-600 dark:text-green-400">
            saved
          </span>
        )}
        {needsBet && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            needs bet
          </span>
        )}
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <CountryFlag country={match.home} size={20} className="shrink-0" />
          <span className="text-base font-medium text-foreground/80">
            {match.home}
          </span>
        </div>
        <span className="text-xs font-bold text-muted-foreground/50 shrink-0">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-foreground/80">
            {match.away}
          </span>
          <CountryFlag country={match.away} size={20} className="shrink-0" />
        </div>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-center">
        <span className="font-mono text-2xl font-extrabold tracking-wider">
          {hasBet ? match.bet : "- : -"}
        </span>
      </div>

      {/* Odds */}
      {match.odds.home && (
        <div className="flex items-center justify-center gap-2">
          <span className="px-2 py-1 rounded-md bg-muted font-mono text-xs text-muted-foreground border border-border">
            H {match.odds.home}
          </span>
          <span className="px-2 py-1 rounded-md bg-muted font-mono text-xs text-muted-foreground border border-border">
            D {match.odds.draw}
          </span>
          <span className="px-2 py-1 rounded-md bg-muted font-mono text-xs text-muted-foreground border border-border">
            A {match.odds.away}
          </span>
        </div>
      )}
    </div>
  );
}
