import { NextRequest, NextResponse } from "next/server";
import { callTool } from "@/lib/mcp-client";
import { get, set, cacheKey, TOOL_TTL } from "@/lib/cache";
import { VALID_TOOLS } from "@/lib/types";
import type { ToolName } from "@/lib/types";

interface RequestBody {
  tool: string;
  args?: Record<string, unknown>;
  skipCache?: boolean;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "MCP_ERROR" },
      { status: 400 }
    );
  }

  const { tool, args, skipCache = false } = body;

  if (!tool) {
    return NextResponse.json(
      { error: "Missing 'tool' field", code: "MCP_ERROR" },
      { status: 400 }
    );
  }

  if (!VALID_TOOLS.includes(tool as ToolName)) {
    return NextResponse.json(
      { error: `Unknown tool: ${tool}`, code: "TOOL_NOT_FOUND" },
      { status: 400 }
    );
  }

  const key = cacheKey(tool, args);
  const ttl = TOOL_TTL[tool] ?? 0;

  if (!skipCache && ttl > 0) {
    const cached = get(key);
    if (cached !== null) {
      return NextResponse.json({ data: cached, cached: true });
    }
  }

  try {
    const data = await callTool(tool, args);

    if (ttl > 0) {
      set(key, data, ttl);
    }

    return NextResponse.json({ data, cached: false, cachedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown MCP error";

    if (message.includes("must be set")) {
      return NextResponse.json(
        { error: message, code: "CREDENTIALS_MISSING" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: message, code: "MCP_ERROR" },
      { status: 500 }
    );
  }
}
