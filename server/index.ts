import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { callTool } from "./lib/mcp-client.js";
import { get, set, cacheKey, TOOL_TTL } from "./lib/cache.js";
import { VALID_TOOLS, type ToolName } from "./lib/types.js";

const app = new Hono();

app.use("/api/*", cors());

app.get("/api/kicktipp/status", async (c) => {
  try {
    const data = await callTool("get_status");
    return c.json({ data, status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "MCP connection failed";
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

  const key = cacheKey(tool, args);
  const ttl = TOOL_TTL[tool] ?? 0;

  if (!skipCache && ttl > 0) {
    const cached = get(key);
    if (cached !== null) {
      return c.json({ data: cached, cached: true });
    }
  }

  try {
    const data = await callTool(tool, args);

    if (ttl > 0) {
      set(key, data, ttl);
    }

    return c.json({ data, cached: false, cachedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown MCP error";

    if (message.includes("must be set")) {
      return c.json({ error: message, code: "CREDENTIALS_MISSING" }, 401);
    }

    return c.json({ error: message, code: "MCP_ERROR" }, 500);
  }
});

app.use("/*", serveStatic({ root: "./out" }));

app.get("*", serveStatic({ root: "./out", path: "/index.html" }));

const port = parseInt(process.env.PORT || "3001", 10);

console.log(`API server listening on port ${port}`);
serve({ fetch: app.fetch, port });
