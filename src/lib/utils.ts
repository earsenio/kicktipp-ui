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

export function isDeadlinePassed(kickoffTime: string): boolean {
  return new Date(kickoffTime).getTime() <= Date.now();
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
