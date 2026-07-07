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

// Grades a tip for color coding, anchored to kicktipp's authoritative awarded points
// so the chip color can never contradict the number shown next to it. `result` is the
// 120-min "H:G" score (what kicktipp scores tips against; penalties are excluded).
// Zero points → wrong; scored + exact → correct; scored but not exact → tendency.
// Falls back to plain string grading only while points are still loading (null).
export function gradeTipWithPoints(
  tip: string | null | undefined,
  result: string | null | undefined,
  points: number | null | undefined
): "correct" | "tendency" | "wrong" | null {
  if (points == null) return gradeTip(tip, result);
  if (points <= 0) return "wrong";
  const t = parseScore((tip ?? "").trim());
  const r = parseScore((result ?? "").trim());
  if (t && r && t.home === r.home && t.away === r.away) return "correct";
  return "tendency"; // scored but not an exact hit
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

// Formats an ISO kickoff instant in the viewer's local timezone, mirroring the
// server's "Sat 5 July · 18:00" style. Falls back to the server-baked string
// (site-timezone) when no parseable kickoff is available. Only call this in
// client-side rendering paths — on the server it would use the server's zone.
export function formatKickoffLocal(
  kickoff: string | null | undefined,
  fallback: string
): string {
  if (!kickoff) return fallback;
  const d = new Date(kickoff);
  if (isNaN(d.getTime())) return fallback;
  return (
    d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

// True when the kickoff instant falls on the viewer's local calendar date.
// Client-side only (uses the runtime's timezone) — drives the Today filter.
export function isKickoffToday(kickoff: string | null | undefined): boolean {
  if (!kickoff) return false;
  const ko = new Date(kickoff);
  if (isNaN(ko.getTime())) return false;
  const now = new Date();
  return (
    ko.getFullYear() === now.getFullYear() &&
    ko.getMonth() === now.getMonth() &&
    ko.getDate() === now.getDate()
  );
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
