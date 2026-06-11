"use client";

import { cn, getMatchStatus, hasResult } from "@/lib/utils";
import type { TodayMatch, BetMatch } from "@/lib/types";
import { ScoreInput } from "@/components/match/score-input";
import { CountryFlag } from "@/components/shared/country-flag";
import { MatchCountdown } from "@/components/match/match-countdown";
import { useDeadline } from "@/hooks/use-deadline";

type ResultType = "correct" | "tendency" | "wrong";

// Pulsing LIVE / static FT badge shown in the date row once a match has kicked off.
function StatusBadge({ live }: { live: boolean }) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
        live ? "bg-accent-red/15 text-accent-red animate-pulse" : "bg-muted text-muted-foreground"
      )}
    >
      {live ? "Live" : "FT"}
    </span>
  );
}

// Shared live/final score block: prominent score, the user's tip beneath it, and a
// correctness chip (Exact / Tendency / Wrong + points) when the tip can be graded.
function ResultDisplay({
  score,
  tip,
  resultType,
}: {
  score: [number, number];
  tip: string | null;
  resultType: ResultType | null;
}) {
  const points = resultType === "correct" ? 4 : resultType === "tendency" ? 2 : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-3xl font-extrabold",
            score[0] > score[1] ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {score[0]}
        </span>
        <span className="text-2xl font-extrabold text-muted-foreground/40">:</span>
        <span
          className={cn(
            "font-mono text-3xl font-extrabold",
            score[1] > score[0] ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {score[1]}
        </span>
      </div>
      {tip && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Your Bet <span className="font-mono font-bold text-foreground/80">{tip}</span>
          </span>
          {resultType && (
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-lg",
                resultType === "correct" && "bg-green-500/15 text-green-600 dark:text-green-400",
                resultType === "tendency" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                resultType === "wrong" && "bg-red-500/15 text-red-600 dark:text-red-400"
              )}
            >
              {points} Pts
            </span>
          )}
        </div>
      )}
    </div>
  );
}

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

// Grades a tip given as a string ("H:G") against the result — used by the dashboard
// MatchCard, whose prediction comes from match.bet rather than numeric inputs.
function getResultTypeFromTip(tip: string, result: string | null | undefined): ResultType | null {
  const parsedTip = parseResult(tip);
  if (!parsedTip) return null;
  return getResultType(parsedTip[0], parsedTip[1], result);
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
  match: BetMatch;
  betState: BetState;
  onBetChange: (field: "home" | "away", value: number | null) => void;
  index: number;
}

export function MatchCardBet({ match, betState, onBetChange, index }: MatchCardBetProps) {
  const status = getMatchStatus(match.kickoff, match.result, match.ended);
  // A match in play stays "live" even before a score appears; the numeric block only
  // renders once a real score exists.
  const isLive = status === "live";
  const isFinished = status === "finished";
  const isUpcoming = status === "upcoming";
  const score = !isUpcoming && hasResult(match.result) ? parseResult(match.result) : null;
  const { isApproaching } = useDeadline(match.kickoff);
  const hasBet = betState.home !== null && betState.away !== null;
  const resultType = score && hasBet ? getResultType(betState.home, betState.away, match.result) : null;
  const homeWins = hasBet && isUpcoming && betState.home! > betState.away!;
  const awayWins = hasBet && isUpcoming && betState.away! > betState.home!;
  const needsBet = !hasBet && isUpcoming;

  let cardState = "default";
  if (isLive) cardState = "live";
  else if (isFinished && score && resultType === "correct") cardState = "finished_correct";
  else if (isFinished && score && resultType === "tendency") cardState = "finished_tendency";
  else if (isFinished && score) cardState = "finished_wrong";
  else if (!isUpcoming) cardState = "locked";
  else if (needsBet) cardState = "needs_bet";
  else if (hasBet && betState.saved) cardState = "saved";

  const tip = hasBet ? `${betState.home}:${betState.away}` : null;

  return (
    <div
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-3 shrink-0 transition-all border-[1.5px]",
        cardState === "needs_bet" && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-amber-500/40",
        cardState === "saved" && "bg-green-500/[0.04] dark:bg-green-500/[0.06] border-green-500/30",
        cardState === "live" && "bg-accent-red/[0.04] dark:bg-accent-red/[0.06] border-accent-red/40",
        cardState === "finished_correct" && "bg-green-500/[0.06] dark:bg-green-500/[0.08] border-green-500/40",
        cardState === "finished_tendency" && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-amber-500/30",
        cardState === "finished_wrong" && "bg-red-500/[0.04] dark:bg-red-500/[0.06] border-red-500/25",
        cardState === "locked" && "bg-muted/50 border-muted-foreground/20 opacity-70",
        cardState === "default" && "bg-card border-border",
        (isApproaching || cardState === "live") && "animate-pulse-border"
      )}
    >
      {/* Date / status — prominent */}
      <div className="flex items-center justify-center gap-2">
        {isUpcoming ? (
          <>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              {match.date}
            </span>
            {match.kickoff && <MatchCountdown time={match.kickoff} />}
          </>
        ) : (
          <StatusBadge live={isLive} />
        )}
        {isUpcoming && hasBet && betState.saved && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-500/15 text-green-600 dark:text-green-400">
            saved
          </span>
        )}
        {isUpcoming && hasBet && betState.modified && !betState.saved && (
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
              homeWins ? "font-extrabold text-foreground" : !isUpcoming ? "text-muted-foreground" : "font-medium text-foreground/80"
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
              awayWins ? "font-extrabold text-foreground" : !isUpcoming ? "text-muted-foreground" : "font-medium text-foreground/80"
            )}
          >
            {match.away}
          </span>
          <CountryFlag country={match.away} size={20} className="shrink-0" />
        </div>
      </div>

      {/* Score area: editable inputs before kickoff, live/final score afterwards */}
      {isUpcoming ? (
        <div className="flex items-center justify-center gap-2">
          <ScoreInput
            value={betState.home}
            onChange={(v) => onBetChange("home", v)}
            modified={betState.modified}
            saved={betState.saved}
            isFinished={false}
            tabIndex={index * 2 + 1}
            aria-label={`${match.home} score`}
          />
          <span className="text-2xl font-extrabold text-muted-foreground/40 px-1">:</span>
          <ScoreInput
            value={betState.away}
            onChange={(v) => onBetChange("away", v)}
            modified={betState.modified}
            saved={betState.saved}
            isFinished={false}
            tabIndex={index * 2 + 2}
            aria-label={`${match.away} score`}
          />
        </div>
      ) : score ? (
        <ResultDisplay score={score} tip={tip} resultType={resultType} />
      ) : (
        // Kicked off but no score yet — keep the user's prediction visible.
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-3xl font-extrabold text-muted-foreground">
            {tip ?? "– : –"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isLive ? "in progress" : "your tip"}
          </span>
        </div>
      )}

      {/* Odds row */}
      {match.odds.home && isUpcoming && (
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
  const { isApproaching } = useDeadline(match.kickoff);
  const status = getMatchStatus(match.kickoff, match.result, match.ended);
  const isUpcoming = status === "upcoming";
  const isLive = status === "live";
  const score = !isUpcoming && hasResult(match.result) ? parseResult(match.result) : null;
  const tip = hasBet ? match.bet : null;
  const resultType = score && tip ? getResultTypeFromTip(tip, match.result) : null;
  const needsBet = match.needsBet && isUpcoming;

  let cardState = "default";
  if (isLive) cardState = "live";
  else if (status === "finished" && score && resultType === "correct") cardState = "finished_correct";
  else if (status === "finished" && score && resultType === "tendency") cardState = "finished_tendency";
  else if (status === "finished" && score) cardState = "finished_wrong";
  else if (!isUpcoming) cardState = "locked";
  else if (needsBet) cardState = "needs_bet";
  else if (hasBet) cardState = "saved";

  return (
    <div
      role="article"
      aria-label={`${match.home} vs ${match.away}, kickoff ${match.time}`}
      className={cn(
        "rounded-2xl p-4 flex flex-col gap-3 transition-all border-[1.5px]",
        cardState === "needs_bet" && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-amber-500/40",
        cardState === "saved" && "bg-green-500/[0.04] dark:bg-green-500/[0.06] border-green-500/30",
        cardState === "live" && "bg-accent-red/[0.04] dark:bg-accent-red/[0.06] border-accent-red/40",
        cardState === "finished_correct" && "bg-green-500/[0.06] dark:bg-green-500/[0.08] border-green-500/40",
        cardState === "finished_tendency" && "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-amber-500/30",
        cardState === "finished_wrong" && "bg-red-500/[0.04] dark:bg-red-500/[0.06] border-red-500/25",
        cardState === "locked" && "bg-muted/50 border-muted-foreground/20 opacity-70",
        cardState === "default" && "bg-card border-border",
        (isApproaching || cardState === "live") && "animate-pulse-border"
      )}
    >
      {/* Date / status — prominent */}
      <div className="flex items-center justify-center gap-2">
        {isUpcoming ? (
          <>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              {match.time}
            </span>
            <MatchCountdown time={match.kickoff} />
          </>
        ) : (
          <StatusBadge live={isLive} />
        )}
        {isUpcoming && hasBet && !needsBet && (
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
          <span className={cn("text-base", !isUpcoming ? "text-muted-foreground" : "font-medium text-foreground/80")}>
            {match.home}
          </span>
        </div>
        <span className="text-xs font-bold text-muted-foreground/50 shrink-0">vs</span>
        <div className="flex items-center gap-2">
          <span className={cn("text-base", !isUpcoming ? "text-muted-foreground" : "font-medium text-foreground/80")}>
            {match.away}
          </span>
          <CountryFlag country={match.away} size={20} className="shrink-0" />
        </div>
      </div>

      {/* Score display: bet before kickoff, live/final score afterwards */}
      {isUpcoming ? (
        <div className="flex items-center justify-center">
          <span className="font-mono text-2xl font-extrabold tracking-wider">
            {hasBet ? match.bet : "- : -"}
          </span>
        </div>
      ) : score ? (
        <ResultDisplay score={score} tip={tip} resultType={resultType} />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-2xl font-extrabold text-muted-foreground tracking-wider">
            {tip ?? "– : –"}
          </span>
          <span className="text-xs text-muted-foreground">{isLive ? "in progress" : "your tip"}</span>
        </div>
      )}

      {/* Odds */}
      {match.odds.home && isUpcoming && (
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
