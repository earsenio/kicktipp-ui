export interface KicktippStatus {
  authenticated: boolean;
  email: string;
  community?: string;
  player?: string;
}

export interface TodayMatch {
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  homeScore?: number;
  awayScore?: number;
  homeBet?: number;
  awayBet?: number;
  status: "upcoming" | "live" | "finished";
  matchday?: number;
}

export interface MatchBet {
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  homeScore?: number;
  awayScore?: number;
  homeBet?: number;
  awayBet?: number;
  points?: number;
  status: "upcoming" | "live" | "finished";
}

export interface ScheduleMatchday {
  matchday: number;
  startDate: string;
  endDate?: string;
  matches: Array<{
    homeTeam: string;
    awayTeam: string;
    homeScore?: number;
    awayScore?: number;
    kickoffTime: string;
  }>;
}

export interface LeaderboardPlayer {
  rank: number;
  name: string;
  points: number;
  correctExact?: number;
  correctDifference?: number;
  correctTendency?: number;
  wrong?: number;
}

export interface OverviewMatchday {
  matchday: number;
  points: number;
  rank?: number;
  totalPlayers?: number;
}

export interface OverviewData {
  matchdays: OverviewMatchday[];
  totalPoints: number;
  currentRank?: number;
}

export interface TableEntry {
  rank: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Community {
  name: string;
  id?: string;
  active: boolean;
}

export interface Player {
  name: string;
  id?: string;
  active: boolean;
}

export interface BonusQuestionOption {
  label: string;
  value: string;
  selected?: boolean;
}

export interface BonusQuestion {
  question: string;
  options: BonusQuestionOption[];
  answer?: string;
  points?: number;
  deadline?: string;
}

export interface GameRules {
  exactScore: number;
  goalDifference: number;
  tendency: number;
  wrong: number;
  bonusPoints?: number;
  description?: string;
}

export interface ApiResponse<T> {
  data: T;
  cached: boolean;
  cachedAt?: number;
}

export interface ApiError {
  error: string;
  code: "MCP_ERROR" | "TOOL_NOT_FOUND" | "CREDENTIALS_MISSING";
}

export const VALID_TOOLS = [
  "get_status",
  "get_today_matches",
  "get_bets",
  "get_schedule",
  "get_leaderboard",
  "get_overview",
  "get_table",
  "get_rules",
  "get_communities",
  "get_players",
  "get_bonus_questions",
  "set_community",
  "set_player",
  "place_bets",
  "place_bonus_bets",
] as const;

export type ToolName = (typeof VALID_TOOLS)[number];
