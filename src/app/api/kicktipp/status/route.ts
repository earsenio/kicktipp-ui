import { NextResponse } from "next/server";
import { callTool } from "@/lib/mcp-client";

export async function GET() {
  try {
    const data = await callTool("get_status");
    return NextResponse.json({ data, status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "MCP connection failed";
    return NextResponse.json(
      { error: message, status: "error" },
      { status: 503 }
    );
  }
}
