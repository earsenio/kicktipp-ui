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
