import { config } from "dotenv";
config({ path: ".env.local" });

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { callTool, VALID_TOOLS, type ToolName } from "./lib/kicktipp.js";
import { get, set, invalidate, cacheKey, TOOL_TTL } from "./lib/cache.js";

const app = new Hono();

app.use("/api/*", cors());

let initialized = false;

async function autoInit() {
  if (initialized) return;
  initialized = true;
  try {
    const status = await callTool("get_status") as { community: string | null };
    if (!status.community) {
      const communities = await callTool("get_communities") as string[];
      if (communities.length > 0) {
        await callTool("set_community", { name: communities[0] });
        console.log(`[auto-init] Community set to: ${communities[0]}`);
      }
    }
  } catch (err) {
    console.error("[auto-init] Failed:", err instanceof Error ? err.message : err);
    initialized = false;
  }
}

app.get("/api/kicktipp/status", async (c) => {
  try {
    await autoInit();
    const data = await callTool("get_status");
    return c.json({ data, status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return c.json({ error: message, status: "error" }, 503);
  }
});

interface RequestBody {
  tool: string;
  args?: Record<string, unknown>;
  skipCache?: boolean;
}

app.post("/api/kicktipp", async (c) => {
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

  await autoInit();

  const key = cacheKey(tool, args);
  const ttl = TOOL_TTL[tool] ?? 0;

  if (!skipCache && ttl > 0) {
    const cached = get(key);
    if (cached !== null) {
      return c.json({ data: cached, cached: true });
    }
  }

  const start = Date.now();
  try {
    const data = await callTool(tool, args);
    console.log(`[${tool}] ${Date.now() - start}ms`);

    if (ttl > 0) {
      set(key, data, ttl);
    }

    if (tool === "place_bets" || tool === "place_bonus_bets") {
      invalidate("get_bets");
      invalidate("get_today_matches");
      invalidate("get_bonus_questions");
    }

    return c.json({ data, cached: false, cachedAt: Date.now() });
  } catch (err) {
    console.error(`[${tool}] FAILED ${Date.now() - start}ms:`, err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("must be set")) {
      return c.json({ error: message, code: "CREDENTIALS_MISSING" }, 401);
    }

    return c.json({ error: message, code: "MCP_ERROR" }, 500);
  }
});

app.use("/*", serveStatic({ root: "./out" }));

app.get("*", serveStatic({ root: "./out", path: "/index.html" }));

process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`API server listening on port ${port}`);
serve({ fetch: app.fetch, port });
