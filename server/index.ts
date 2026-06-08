// Hono API server: auth routes, tool proxy to kicktipp-agent, and static file serving.
// In production, this single process serves both the API and the Next.js static export.
import { config } from "dotenv";
config({ path: ".env.local" });

import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { callTool, VALID_TOOLS, SHARED_TOOLS, type ToolName, type UserSession } from "./lib/kicktipp.js";
import { createSession, getSession, destroySession } from "./lib/session.js";
import { get, set, invalidate, cacheKey, TOOL_TTL } from "./lib/cache.js";

const COOKIE_NAME = "kt-session";

const app = new Hono();

// Reflect the request origin so the app works from any device on the local network
app.use("/api/*", cors({
  origin: (origin) => origin || "*",
  credentials: true,
}));

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
    const session = await createSession(email, password);
    setCookie(c, COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return c.json({ email: session.email, community: session.community, token: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return c.json({ error: message }, 401);
  }
});

app.post("/api/auth/logout", async (c) => {
  const session = requireSession(c);
  if (session) {
    destroySession(session.id);
    deleteCookie(c, COOKIE_NAME, { path: "/" });
  }
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const session = requireSession(c);
  if (!session) return c.json({ error: "Not authenticated" }, 401);
  return c.json({ email: session.email, community: session.community });
});

// ── Auth middleware for /api/kicktipp/* ──────────────────────────

// Dual auth: check Authorization header first (works cross-origin in dev),
// fall back to httpOnly cookie (works same-origin in production).
function requireSession(c: Context): UserSession | null {
  const auth = c.req.header("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const session = getSession(token);
    if (session) return session;
  }
  const sessionId = getCookie(c, COOKIE_NAME);
  if (!sessionId) return null;
  return getSession(sessionId);
}

// ── Auto-init community for a session ───────────────────────────

async function autoInit(session: UserSession) {
  if (session.community) return;
  try {
    const status = await callTool("get_status", undefined, session) as { community: string | null };
    if (!status.community) {
      const communities = await callTool("get_communities", undefined, session) as string[];
      if (communities.length > 0) {
        await callTool("set_community", { name: communities[0] }, session);
        console.log(`[auto-init] Community set to: ${communities[0]}`);
      }
    }
  } catch (err) {
    console.error("[auto-init] Failed:", err instanceof Error ? err.message : err);
  }
}

// ── Status endpoint ─────────────────────────────────────────────

app.get("/api/kicktipp/status", async (c) => {
  const session = requireSession(c);
  if (!session) return c.json({ error: "Not authenticated", code: "NOT_AUTHENTICATED" }, 401);

  try {
    await autoInit(session);
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
  const session = requireSession(c);
  if (!session) return c.json({ error: "Not authenticated", code: "NOT_AUTHENTICATED" }, 401);

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

  // Shared tools (schedule, leaderboard, etc.) use a global cache key;
  // per-user tools (bets, today_matches) are scoped by session ID.
  const userId = SHARED_TOOLS.has(tool) ? undefined : session.id;
  const key = cacheKey(tool, args, userId);
  const ttl = TOOL_TTL[tool] ?? 0;

  if (!skipCache && ttl > 0) {
    const cached = get(key);
    if (cached !== null) {
      return c.json({ data: cached, cached: true });
    }
  }

  const start = Date.now();
  try {
    const data = await callTool(tool, args, session);
    console.log(`[${tool}] ${Date.now() - start}ms`);

    if (ttl > 0) {
      set(key, data, ttl);
    }

    // After writes, bust the user's cached reads so they see fresh data
    if (tool === "place_bets" || tool === "place_bonus_bets") {
      invalidate(`${session.id}:get_bets`);
      invalidate(`${session.id}:get_today_matches`);
      invalidate(`${session.id}:get_bonus_questions`);
    }

    return c.json({ data, cached: false, cachedAt: Date.now() });
  } catch (err) {
    console.error(`[${tool}] FAILED ${Date.now() - start}ms:`, err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message, code: "MCP_ERROR" }, 500);
  }
});

// ── Static file serving ─────────────────────────────────────────

app.use("/*", serveStatic({ root: "./out" }));

app.get("*", serveStatic({ root: "./out", path: "/index.html" }));

process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`API server listening on port ${port}`);
serve({ fetch: app.fetch, port });
