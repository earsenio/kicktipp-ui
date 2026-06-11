// Shared utilities: Tailwind class merging, score parsing, API base URL.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatScore(home: number, away: number): string {
  return `${home}:${away}`;
}

export function parseScore(scoreStr: string): { home: number; away: number } | null {
  const match = scoreStr.match(/^(\d+):(\d+)$/);
  if (!match) return null;
  return { home: parseInt(match[1], 10), away: parseInt(match[2], 10) };
}

// Grades a "H:G" tip against a "H:G" result: exact score, correct tendency
// (winner/draw), or wrong. Returns null when either is missing/unparseable.
export function gradeTip(
  tip: string | null | undefined,
  result: string | null | undefined
): "correct" | "tendency" | "wrong" | null {
  const t = parseScore((tip ?? "").trim());
  const r = parseScore((result ?? "").trim());
  if (!t || !r) return null;
  if (t.home === r.home && t.away === r.away) return "correct";
  if (Math.sign(t.home - t.away) === Math.sign(r.home - r.away)) return "tendency";
  return "wrong";
}

export function isDeadlinePassed(kickoffTime: string): boolean {
  return new Date(kickoffTime).getTime() <= Date.now();
}

export type MatchStatus = "upcoming" | "live" | "finished";

// Matches are considered "live" for up to 3h after kickoff — mirrors the threshold
// used by MatchCountdown so the countdown badge and the status never disagree.
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

// A result is only meaningful if it parses to two integers; "-:-" (not started)
// and malformed values are treated as "no result".
export function hasResult(result: string | null | undefined): boolean {
  return parseScore((result ?? "").trim()) !== null;
}

// Single source of truth for a match's lifecycle. When a real score exists, kicktipp's
// own `ended` flag (final whistle) is authoritative: ended → finished, else in-play → live.
// Without a score we fall back to the kickoff time: upcoming before kickoff, live within
// the ~3h window after, finished beyond it.
export function getMatchStatus(
  kickoff: string | null | undefined,
  result: string | null | undefined,
  ended = false
): MatchStatus {
  if (hasResult(result)) return ended ? "finished" : "live";
  const ko = kickoff ? new Date(kickoff).getTime() : NaN;
  if (isNaN(ko)) return "upcoming";
  if (Date.now() < ko) return "upcoming";
  return Date.now() - ko < LIVE_WINDOW_MS ? "live" : "finished";
}

export function minutesUntilKickoff(kickoffTime: string): number {
  const diff = new Date(kickoffTime).getTime() - Date.now();
  return Math.floor(diff / 60000);
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function getInitials(name: string): string {
  return name
    .split(/[\s\-\.]+/)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
