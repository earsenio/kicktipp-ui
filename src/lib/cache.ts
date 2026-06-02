export const TTL = {
  TODAY_MATCHES: 60,
  BETS: 30,
  LEADERBOARD: 120,
  SCHEDULE: 3600,
  TABLE: 3600,
  OVERVIEW: 300,
  RULES: 86400,
  COMMUNITIES: 3600,
  PLAYERS: 3600,
  BONUS_QUESTIONS: 600,
} as const;

export const TOOL_TTL: Record<string, number> = {
  get_today_matches: TTL.TODAY_MATCHES,
  get_bets: TTL.BETS,
  get_schedule: TTL.SCHEDULE,
  get_leaderboard: TTL.LEADERBOARD,
  get_overview: TTL.OVERVIEW,
  get_table: TTL.TABLE,
  get_rules: TTL.RULES,
  get_communities: TTL.COMMUNITIES,
  get_players: TTL.PLAYERS,
  get_bonus_questions: TTL.BONUS_QUESTIONS,
  get_status: 0,
  set_community: 0,
  set_player: 0,
  place_bets: 0,
  place_bonus_bets: 0,
};

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function get(key: string): unknown | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function set(key: string, data: unknown, ttlSeconds: number): void {
  if (ttlSeconds <= 0) return;
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidate(keyPrefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
    }
  }
}

export function cacheKey(tool: string, args?: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return tool;
  const sorted = Object.keys(args)
    .sort()
    .map((k) => `${k}=${JSON.stringify(args[k])}`)
    .join("&");
  return `${tool}:${sorted}`;
}
