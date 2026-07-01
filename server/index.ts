// Hono API server: auth routes, scraping tool proxy, and static file serving.
// In production, this single process serves both the API and the Next.js static export.
import { config } from "dotenv";
config({ path: ".env.local" });

import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { callTool, loginSession, getCurrentTipperId, stampCurrentPlayer, VALID_TOOLS, SHARED_TOOLS, type ToolName, type UserSession } from "./lib/kicktipp.js";
import {
  createToken, verifyToken, updateToken,
  getKicktippSession, syncCookieCache, destroyKicktippSession,
  type TokenPayload,
} from "./lib/session.js";
import { get, set, invalidate, cacheKey, TOOL_TTL } from "./lib/cache.js";

const COOKIE_NAME = "kt-session";

const app = new Hono();

// Reflect the request origin so the app works from any device on the local network
app.use("/api/*", cors({
  origin: (origin) => origin || "*",
  credentials: true,
  exposeHeaders: ["X-Token-Refresh"],
}));

// ── Helpers ─────────────────────────────────────────────────────

function setTokenCookie(c: Context, token: string) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

type VerifiedPayload = TokenPayload & { iat?: number; exp?: number };

async function requireSession(c: Context): Promise<{ session: UserSession; payload: VerifiedPayload } | null> {
  let token: string | undefined;

  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    token = auth.slice(7);
  }
  if (!token) {
    token = getCookie(c, COOKIE_NAME);
  }
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await getKicktippSession(payload);
  return { session, payload };
}

// Rolling-session renewal: re-issue the JWT (fresh 24h expiry) when the session
// state diverged from the token (community/player changed) OR the token is older
// than the refresh interval, so any activity within 24h extends the window. The
// age gate bounds re-issues to ~once/hour per active user. Sets the httpOnly
// cookie (re-stamping maxAge) and the X-Token-Refresh header for the Bearer token.
const REFRESH_AFTER_MS = 60 * 60 * 1000;

async function maybeRefreshToken(
  c: Context,
  session: UserSession,
  payload: VerifiedPayload
): Promise<VerifiedPayload> {
  const changed = session.community !== payload.community || session.player !== payload.player;
  const ageMs = payload.iat ? Date.now() - payload.iat * 1000 : Infinity;
  if (!changed && ageMs < REFRESH_AFTER_MS) return payload;

  const newToken = await updateToken(payload, {
    community: session.community,
    player: session.player,
  });
  setTokenCookie(c, newToken);
  c.header("X-Token-Refresh", newToken);
  return { ...payload, community: session.community, player: session.player };
}

// ── Auth routes (no session required) ────────────────────────────

app.post("/api/auth/login", async (c) => {
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  try {
    const session: UserSession = {
      id: email,
      email,
      password,
      cookies: "",
      loggedIn: false,
      community: "",
      player: "",
      lastActive: Date.now(),
    };

    await loginSession(session);
    syncCookieCache(session);

    await autoInit(session);
    syncCookieCache(session);

    const token = await createToken(email, password, session.community, session.player);
    setTokenCookie(c, token);
    return c.json({ email: session.email, community: session.community, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return c.json({ error: message }, 401);
  }
});

app.post("/api/auth/logout", async (c) => {
  const result = await requireSession(c);
  if (result) {
    destroyKicktippSession(result.payload.email);
    deleteCookie(c, COOKIE_NAME, { path: "/" });
  }
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const result = await requireSession(c);
  if (!result) return c.json({ error: "Not authenticated" }, 401);
  // Slide the 24h window on each app load (gated to ~hourly inside the helper).
  const payload = await maybeRefreshToken(c, result.session, result.payload);
  return c.json({ email: payload.email, community: payload.community });
});

// ── Auto-init community for a session ───────────────────────────

async function autoInit(session: UserSession) {
  if (session.community) return;
  try {
    const status = await callTool("get_status", undefined, session) as { community: string | null };
    if (!status.community) {
      let communities: string[] = [];
      for (let attempt = 0; attempt < 2 && !communities.length; attempt++) {
        if (attempt > 0) console.log("[auto-init] Retrying get_communities...");
        communities = await callTool("get_communities", undefined, session) as string[];
      }
      console.log(`[auto-init] Found ${communities.length} communities`);
      if (communities.length > 0) {
        await callTool("set_community", { name: communities[0] }, session);
        console.log(`[auto-init] Community set to: ${communities[0]}`);
      }
    }
  } catch (err) {
    console.error("[auto-init] Failed:", err instanceof Error ? err.message : err);
  }
}

// ── Health check (unauthenticated, for Railway) ────────────────

app.get("/api/health", (c) => c.json({ ok: true }));

// ── Status endpoint ─────────────────────────────────────────────

app.get("/api/kicktipp/status", async (c) => {
  const result = await requireSession(c);
  if (!result) return c.json({ error: "Not authenticated", code: "NOT_AUTHENTICATED" }, 401);
  const { session } = result;
  let { payload } = result;

  try {
    await autoInit(session);
    syncCookieCache(session);
    payload = await maybeRefreshToken(c, session, payload);
    const data = await callTool("get_status", undefined, session);
    return c.json({ data, status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return c.json({ error: message, status: "error" }, 503);
  }
});

// ── Main tool proxy ─────────────────────────────────────────────

interface RequestBody {
  tool: string;
  args?: Record<string, unknown>;
  skipCache?: boolean;
}

app.post("/api/kicktipp", async (c) => {
  const result = await requireSession(c);
  if (!result) return c.json({ error: "Not authenticated", code: "NOT_AUTHENTICATED" }, 401);
  const { session } = result;
  let { payload } = result;

  let body: RequestBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body", code: "MCP_ERROR" }, 400);
  }

  const { tool, args, skipCache = false } = body;

  if (!tool) {
    return c.json({ error: "Missing 'tool' field", code: "MCP_ERROR" }, 400);
  }

  if (!VALID_TOOLS.includes(tool as ToolName)) {
    return c.json({ error: `Unknown tool: ${tool}`, code: "TOOL_NOT_FOUND" }, 400);
  }

  await autoInit(session);
  syncCookieCache(session);
  payload = await maybeRefreshToken(c, session, payload);

  const RANKING_TOOLS = new Set(["get_leaderboard", "get_overview", "get_matchday_predictions"]);
  const NO_COMMUNITY_TOOLS = new Set(["get_communities", "get_status", "set_community"]);
  if (!session.community && !NO_COMMUNITY_TOOLS.has(tool)) {
    return c.json({ error: "No community set. Please select a community first.", code: "NO_COMMUNITY" }, 400);
  }

  // Shared tools (schedule, leaderboard, etc.) use a global cache key;
  // per-user tools (bets, today_matches) are scoped by email.
  const userId = SHARED_TOOLS.has(tool) ? undefined : session.id;
  const key = cacheKey(tool, args, userId);
  const ttl = TOOL_TTL[tool] ?? 0;

  // Ranking tables carry a per-user "isCurrentPlayer" flag, but they are shared-cached
  // across users. Stamp the flag per request (by the caller's participant id) so the
  // shared cache stays identity-neutral and every user sees their own row highlighted.
  const stampForUser = async (payload: unknown) =>
    RANKING_TOOLS.has(tool)
      ? stampCurrentPlayer(tool, payload, await getCurrentTipperId(session))
      : payload;

  if (!skipCache && ttl > 0) {
    const cached = get(key);
    if (cached !== null) {
      return c.json({ data: await stampForUser(cached), cached: true });
    }
  }

  // Best-effort deadline check for write operations
  if (tool === "place_bets") {
    try {
      const matchday = (args as Record<string, unknown>)?.matchday as number | undefined;
      const betsData = await callTool("get_bets", { matchday }, session) as { matches: Array<{ kickoff?: string | null }> };
      syncCookieCache(session);
      const allLocked = betsData.matches.every((m) => m.kickoff && new Date(m.kickoff).getTime() <= Date.now());
      if (allLocked && betsData.matches.length > 0) {
        return c.json({ error: "All matches have kicked off — predictions are locked", code: "MCP_ERROR" }, 400);
      }
    } catch {
      // Check failed — let Kicktipp's server enforce the deadline
    }
  }

  const start = Date.now();
  try {
    const data = await callTool(tool, args, session);
    syncCookieCache(session);
    console.log(`[${tool}] ${Date.now() - start}ms`);

    const isEmpty = tool === "get_communities" && Array.isArray(data) && data.length === 0;
    if (ttl > 0 && !isEmpty) {
      set(key, data, ttl);
    }

    // After writes, bust the user's cached reads so they see fresh data
    if (tool === "place_bets" || tool === "place_bonus_bets") {
      invalidate(`${session.id}:get_bets`);
      invalidate(`${session.id}:get_today_matches`);
      invalidate(`${session.id}:get_bonus_questions`);
    }

    // If community or player changed, issue updated JWT
    if (tool === "set_community" || tool === "set_player") {
      payload = await maybeRefreshToken(c, session, payload);
    }

    return c.json({ data: await stampForUser(data), cached: false, cachedAt: Date.now() });
  } catch (err) {
    syncCookieCache(session);
    console.error(`[${tool}] FAILED ${Date.now() - start}ms:`, err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message, code: "MCP_ERROR" }, 500);
  }
});

// ── Static file serving ─────────────────────────────────────────

app.use("/*", serveStatic({ root: "./out" }));

// Clean URLs: /login → /login.html, /leaderboard → /leaderboard.html, etc.
app.use("/*", serveStatic({
  root: "./out",
  rewriteRequestPath: (path) => `${path}.html`,
}));

app.get("*", serveStatic({ root: "./out", path: "/index.html" }));

process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`API server listening on port ${port}`);
serve({ fetch: app.fetch, port });
