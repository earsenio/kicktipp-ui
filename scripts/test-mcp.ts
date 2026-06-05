import { config } from "dotenv";
config({ path: ".env.local" });

import { callTool } from "../server/lib/mcp-client";

async function testTool(name: string, args?: Record<string, unknown>) {
  console.log(`--- ${name} ${args ? JSON.stringify(args) : ""} ---`);
  try {
    const result = await callTool(name, args);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.error(`FAILED: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function main() {
  console.log("Testing MCP connection...\n");

  try {
    const status = await testTool("get_status");
    console.log();

    const communities = await testTool("get_communities");
    console.log();

    if (Array.isArray(communities) && communities.length > 0) {
      await testTool("set_community", { name: communities[0] });
      console.log();

      await testTool("get_today_matches");
      console.log();
      await testTool("get_bets");
      console.log();
      await testTool("get_schedule");
      console.log();
      await testTool("get_leaderboard");
      console.log();
      await testTool("get_overview");
      console.log();
      await testTool("get_table");
      console.log();
      await testTool("get_rules");
      console.log();
      await testTool("get_players");
      console.log();
      await testTool("get_bonus_questions");
      console.log();
    } else {
      console.log("No communities found — skipping data tools.");
      console.log("Join a community on kicktipp.com to test all tools.\n");
    }

    console.log("MCP bridge test complete!");
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
