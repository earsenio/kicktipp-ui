"use client";

import { useState } from "react";
import { cn, getMatchStatus, gradeTipWithPoints, hasResult } from "@/lib/utils";
import type { BetMatch } from "@/lib/types";
import { ScoreInput } from "@/components/match/score-input";
import { CountryFlag } from "@/components/shared/country-flag";
import { MatchCountdown } from "@/components/match/match-countdown";
import { MatchPredictionsSheet } from "@/components/match/match-predictions-sheet";
import { useDeadline } from "@/hooks/use-deadline";
import { Users } from "lucide-react";

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
const RESULT_LABEL: Record<ResultType, string> = {
  correct: "Exact",
  tendency: "Tendency",
  wrong: "Wrong",
};

function ResultDisplay({
  score,
  penaltyResult,
  tip,
  resultType,
  points,
}: {
  score: [number, number];
  // Penalty-shootout score ("H:G") shown on its own line below the 120-min score.
  penaltyResult?: string | null;
  tip: string | null;
  resultType: ResultType | null;
  // Real points earned for this match (from the leaderboard). null while loading
  // or before kicktipp has scored it — we then fall back to the grade word.
  points?: number | null;
}) {
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
      {penaltyResult && (() => {
        // Headline final (e.g. "4:5 a.TAB"): kept on its own line, separate from the
        // 120-min score above which kicktipp grades tips against. The string carries
        // kicktipp's own marker (a.TAB / n.V. / …); split it off so we can style it.
        const [penScore, ...rest] = penaltyResult.split(" ");
        const marker = rest.join(" ");
        return (
          <span className="text-xs font-medium text-muted-foreground">
            <span className="font-mono font-bold text-foreground/80">{penScore}</span>
            {marker && <span className="ml-1">{marker}</span>}
          </span>
        );
      })()}
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
              {points != null ? `${points} Pts` : RESULT_LABEL[resultType]}
            </span>
          )}
        </div>
      )}
    </div>
  );
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
  // When provided, a finished card can open the all-players predictions sheet.
  matchday?: number;
  matchIndex?: number;
  // Real points earned for this match (current user), sourced from the leaderboard.
  points?: number | null;
}

export function MatchCardBet({ match, betState, onBetChange, index, matchday, matchIndex, points }: MatchCardBetProps) {
  const [predictionsOpen, setPredictionsOpen] = useState(false);
  const status = getMatchStatus(match.kickoff, match.result, match.ended);
  // A match in play stays "live" even before a score appears; the numeric block only
  // renders once a real score exists.
  const isLive = status === "live";
  const isFinished = status === "finished";
  const isUpcoming = status === "upcoming";
  const score = !isUpcoming && hasResult(match.result) ? parseResult(match.result) : null;
  const { isApproaching } = useDeadline(match.kickoff);
  const hasBet = betState.home !== null && betState.away !== null;
  const tip = hasBet ? `${betState.home}:${betState.away}` : null;
  // Color is anchored to kicktipp's awarded points (graded on the 120-min result) so the
  // chip color never contradicts the points shown; penalties don't affect grading.
  const resultType = score && hasBet ? gradeTipWithPoints(tip, match.result, points) : null;
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

  // Which outcome the user's current prediction points to — drives the green badge.
  // Updates live as scores are typed and persists for live/finished cards via the saved bet.
  const predictedOutcome: "home" | "draw" | "away" | null = hasBet
    ? betState.home! > betState.away!
      ? "home"
      : betState.home! < betState.away!
        ? "away"
        : "draw"
    : null;

  // Merged odds + bonus-points pills (home / draw / away by position, no text labels).
  const outcomes = [
    { key: "home" as const, odds: match.odds.home, bonus: match.bonusPoints?.home },
    { key: "draw" as const, odds: match.odds.draw, bonus: match.bonusPoints?.draw },
    { key: "away" as const, odds: match.odds.away, bonus: match.bonusPoints?.away },
  ];
  const hasOddsRow = Boolean(match.odds.home) || match.bonusPoints != null;

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
        <ResultDisplay score={score} penaltyResult={match.penaltyResult} tip={tip} resultType={resultType} points={points} />
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

      {/* Odds + bonus-points row — shown at all times (upcoming, live, finished).
          Each pill = that outcome's decimal odds, with its bonus points as a corner
          badge that turns green for the outcome the user predicted. */}
      {hasOddsRow && (
        <div className="flex items-center justify-center gap-3">
          {outcomes.map((o) => (
            <div key={o.key} className="relative">
              <span className="block px-2.5 py-1 rounded-md bg-muted font-mono text-xs text-muted-foreground border border-border">
                {o.odds || "–"}
              </span>
              {o.bonus != null && (
                <span
                  className={cn(
                    "absolute -top-1.5 -right-1.5 flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-full font-mono text-[10px] font-bold border",
                    predictedOutcome === o.key
                      ? "bg-accent-green text-white border-accent-green"
                      : "bg-background text-muted-foreground border-border"
                  )}
                  title={`+${o.bonus} pts if ${o.key === "home" ? match.home + " win" : o.key === "away" ? match.away + " win" : "draw"}`}
                >
                  {o.bonus}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* All-players predictions — visible once tips go public (kickoff), i.e. live or finished */}
      {(isFinished || isLive) && matchday != null && matchIndex != null && (
        <>
          <button
            onClick={() => setPredictionsOpen(true)}
            className="flex items-center justify-center gap-1.5 w-full rounded-xl py-2 text-xs font-bold text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            See all predictions
          </button>
          <MatchPredictionsSheet
            open={predictionsOpen}
            onOpenChange={setPredictionsOpen}
            matchday={matchday}
            matchIndex={matchIndex}
            home={match.home}
            away={match.away}
            result={match.result}
            penaltyResult={match.penaltyResult}
          />
        </>
      )}
    </div>
  );
}
