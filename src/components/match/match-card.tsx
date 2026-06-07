"use client";

import { cn } from "@/lib/utils";
import type { TodayMatch, BetMatch } from "@/lib/types";
import { ScoreInput } from "@/components/match/score-input";

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
        "rounded-[14px] p-3.5 flex flex-col gap-3 shrink-0 transition-all",
        cardState === "needs_bet" && "bg-white/[0.03] border-[1.5px] border-amber-500/35",
        cardState === "saved" && "bg-white/[0.03] border-[1.5px] border-green-500/20",
        cardState === "finished_correct" && "bg-green-500/[0.03] border-[1.5px] border-green-500/30",
        cardState === "finished_tendency" && "bg-amber-500/[0.02] border-[1.5px] border-amber-500/25",
        cardState === "finished_wrong" && "bg-red-500/[0.02] border-[1.5px] border-red-500/15",
        cardState === "default" && "bg-white/[0.03] border-[1.5px] border-white/[0.05]"
      )}
    >
      {/* Teams row — centered */}
      <div className="flex items-center justify-center gap-2">
        <span
          className={cn(
            "text-sm truncate transition-all text-right",
            homeWins ? "font-extrabold text-foreground" : isFinished ? "text-white/35 font-medium" : "text-white/55 font-medium"
          )}
        >
          {match.home}
        </span>
        <span className="text-[9px] font-semibold text-white/[0.12] shrink-0">vs</span>
        <span
          className={cn(
            "text-sm truncate transition-all",
            awayWins ? "font-extrabold text-foreground" : isFinished ? "text-white/35 font-medium" : "text-white/55 font-medium"
          )}
        >
          {match.away}
        </span>
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
        <span className="text-[22px] font-extrabold text-white/15 px-0.5">:</span>
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
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-[9px] font-semibold text-white/30 uppercase tracking-[1px]">
            Final Result
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-mono text-[28px] font-extrabold",
                parsed[0] > parsed[1] ? "text-foreground" : "text-white/40"
              )}
            >
              {parsed[0]}
            </span>
            <span className="text-2xl font-extrabold text-white/30">:</span>
            <span
              className={cn(
                "font-mono text-[28px] font-extrabold",
                parsed[1] > parsed[0] ? "text-foreground" : "text-white/40"
              )}
            >
              {parsed[1]}
            </span>
          </div>
          {resultType && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-bold px-2.5 py-0.5 rounded-lg",
                  resultType === "correct" && "bg-green-500/[0.12] text-green-500",
                  resultType === "tendency" && "bg-amber-500/[0.12] text-amber-500",
                  resultType === "wrong" && "bg-red-500/10 text-red-500"
                )}
              >
                {resultType === "correct" ? "✓ Exact" : resultType === "tendency" ? "~ Tendency" : "✗ Wrong"}
              </span>
              {resultType !== "wrong" && (
                <span
                  className={cn(
                    "font-mono text-[11px] font-bold",
                    resultType === "correct" ? "text-green-500" : "text-amber-500"
                  )}
                >
                  +{resultType === "correct" ? "4" : "2"} pts
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Meta row — centered */}
      <div className="flex items-center justify-center flex-wrap gap-2">
        {isFinished ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/[0.06] text-white/50">
            FT
          </span>
        ) : (
          <span className="text-[11px] text-white/35">{match.date}</span>
        )}
        {!isFinished && hasBet && betState.saved && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-500/[0.12] text-green-500">
            saved
          </span>
        )}
        {!isFinished && hasBet && betState.modified && !betState.saved && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/[0.12] text-amber-500">
            unsaved
          </span>
        )}
        {needsBet && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/[0.12] text-amber-500">
            needs bet
          </span>
        )}
        {match.odds.home && (
          <>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.03] font-mono text-[10px] text-white/40 border border-white/[0.04]">
              H {match.odds.home}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.03] font-mono text-[10px] text-white/40 border border-white/[0.04]">
              D {match.odds.draw}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.03] font-mono text-[10px] text-white/40 border border-white/[0.04]">
              A {match.odds.away}
            </span>
          </>
        )}
      </div>
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
        "rounded-[14px] p-3.5 flex flex-col gap-3 transition-all",
        needsBet && "bg-white/[0.03] border-[1.5px] border-amber-500/35",
        hasBet && !needsBet && "bg-white/[0.03] border-[1.5px] border-green-500/20",
        !hasBet && !needsBet && "bg-white/[0.03] border-[1.5px] border-white/[0.05]"
      )}
    >
      {/* Teams row — centered */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-medium truncate text-white/55">
          {match.home}
        </span>
        <span className="text-[9px] font-semibold text-white/[0.12] shrink-0">vs</span>
        <span className="text-sm font-medium truncate text-white/55">
          {match.away}
        </span>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-center">
        <span className="font-mono text-xl font-extrabold tracking-wider">
          {hasBet ? match.bet : "— : —"}
        </span>
      </div>

      {/* Meta row — centered */}
      <div className="flex items-center justify-center flex-wrap gap-2">
        <span className="text-[11px] text-white/35">{match.time}</span>
        {hasBet && !needsBet && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-500/[0.12] text-green-500">
            saved
          </span>
        )}
        {needsBet && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/[0.12] text-amber-500">
            needs bet
          </span>
        )}
        {match.odds.home && (
          <>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.03] font-mono text-[10px] text-white/40 border border-white/[0.04]">
              H {match.odds.home}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.03] font-mono text-[10px] text-white/40 border border-white/[0.04]">
              D {match.odds.draw}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.03] font-mono text-[10px] text-white/40 border border-white/[0.04]">
              A {match.odds.away}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
