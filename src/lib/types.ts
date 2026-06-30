// TypeScript interfaces for all API response shapes, mirroring the data
// returned by each scraping tool in server/lib/kicktipp.ts.

// ── get_status ──

export interface KicktippStatus {
  credentials_saved: boolean;
  community: string | null;
  player: string | null;
  setup_needed: boolean;
  setup_instructions: string | null;
}

// ── get_today_matches ──

export interface TodayMatch {
  time: string;
  kickoff: string;
  home: string;
  away: string;
  bet: string;
  odds: { home: string; draw: string; away: string };
  // Bonus/tendency points per outcome (+home-win / +draw / +away-win). null if not shown.
  bonusPoints: { home: number; draw: number; away: number } | null;
  needsBet: boolean;
  // Live or final score scraped from kicktipp ("H:G"), or "-:-" when not started.
  // For knockout games this is the 120-min score (the one kicktipp grades tips against).
  result: string;
  // Headline final for knockout games decided after the graded 120-min result — a
  // display string like "4:5 a.TAB" (score + kicktipp's marker). null for normal matches.
  penaltyResult?: string | null;
  // True once kicktipp marks the match final (final whistle), distinct from in-play.
  ended: boolean;
}

export interface TodayMatchesResponse {
  title: string;
  matches: TodayMatch[];
}

// ── get_bets ──

export interface BetMatch {
  date: string;
  kickoff: string | null;
  home: string;
  away: string;
  bet: string;
  odds: { home: string; draw: string; away: string };
  // Bonus/tendency points per outcome (+home-win / +draw / +away-win). null if not shown.
  bonusPoints: { home: number; draw: number; away: number } | null;
  // Live or final score scraped from kicktipp ("H:G"), or "-:-" when not started.
  // For knockout games this is the 120-min score (the one kicktipp grades tips against).
  result: string;
  // Headline final for knockout games decided after the graded 120-min result — a
  // display string like "4:5 a.TAB" (score + kicktipp's marker). null for normal matches.
  penaltyResult?: string | null;
  // True once kicktipp marks the match final (final whistle), distinct from in-play.
  ended: boolean;
}

export interface BetsResponse {
  title: string;
  matches: BetMatch[];
  maxMatchday: number;
  // The matchday kicktipp marks active on the no-arg predict page (the current one).
  currentMatchday?: number | null;
}

// ── get_schedule ──

export interface ScheduleMatch {
  date: string;
  kickoff?: string | null;
  home: string;
  away: string;
  result: string;
  // Headline final for knockout games decided after the graded 120-min result — a
  // display string like "4:5 a.TAB" (score + kicktipp's marker). null for normal matches.
  penaltyResult?: string | null;
  ended?: boolean;
}

export interface ScheduleResponse {
  title: string;
  matches: ScheduleMatch[];
}

// ── get_leaderboard ──

export interface LeaderboardRanking {
  position: string;
  name: string;
  matchdayPoints: string;
  bonus: string;
  total: string;
  isCurrentPlayer: boolean;
}

export interface LeaderboardBonusQuestion {
  abbreviation: string;
  question: string;
  result: string;
}

export interface LeaderboardResponse {
  title: string;
  matches?: ScheduleMatch[];
  bonusQuestions?: LeaderboardBonusQuestion[];
  rankings: LeaderboardRanking[];
}

// ── get_overview ──

export interface OverviewPlayer {
  position: string;
  name: string;
  matchdays: Record<number, string>;
  bonus: string;
  wins: string;
  total: string;
  isCurrentPlayer: boolean;
}

export interface OverviewResponse {
  label: string;
  maxMatchday: number;
  players: OverviewPlayer[];
}

// ── get_rules ──

export interface RulesSection {
  type: "heading" | "paragraph" | "table";
  text?: string;
  headers?: string[];
  rows?: string[][];
}

// ── get_bonus_questions ──

export interface BonusQuestionSelect {
  name: string;
  options: Array<{ value: string; text: string }>;
  selected: string;
}

export interface BonusQuestion {
  question: string;
  selects: BonusQuestionSelect[];
}

// ── get_bonus_questions (response wrapper) ──

export interface BonusQuestionsResponse {
  questions: BonusQuestion[];
  deadline: string | null;
}

// ── get_matchday_predictions ──

export interface PlayerPrediction {
  name: string;
  position: string;
  // True for the logged-in user's row (name === session.player).
  isCurrentPlayer: boolean;
  // One entry per match of the matchday (by column order); tip "H:G" or null when hidden.
  predictions: Array<{ tip: string | null; points: number | null }>;
}

export interface MatchdayPredictionsResponse {
  matchday: number;
  matches: Array<{ index: number; label: string }>;
  players: PlayerPrediction[];
}

// ── set_community / set_player ──

export interface SetResult {
  success: boolean;
  community?: string;
  player?: string;
  error?: string;
}

// ── place_bets ──

export interface PlacedBet {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

export interface PlaceBetsResult {
  success: boolean;
  dry_run: boolean;
  placed: PlacedBet[];
}

// ── place_bonus_bets ──

export interface PlacedBonusBet {
  question: string;
  answer: string;
}

export interface PlaceBonusBetsResult {
  success: boolean;
  dry_run: boolean;
  placed: PlacedBonusBet[];
}

// ── API wrapper types ──

export interface ApiResponse<T> {
  data: T;
  cached: boolean;
  cachedAt?: number;
}

export interface ApiError {
  error: string;
  code: "MCP_ERROR" | "TOOL_NOT_FOUND" | "CREDENTIALS_MISSING";
}

// ── Tool registry ──

export const VALID_TOOLS = [
  "get_status",
  "get_today_matches",
  "get_bets",
  "get_schedule",
  "get_leaderboard",
  "get_overview",
  "get_rules",
  "get_communities",
  "get_players",
  "get_bonus_questions",
  "get_matchday_predictions",
  "set_community",
  "set_player",
  "place_bets",
  "place_bonus_bets",
] as const;

export type ToolName = (typeof VALID_TOOLS)[number];
