import { config } from "dotenv";
config({ path: ".env.local" });

import { callTool, disconnectClient } from "../src/lib/mcp-client";

async function main() {
  console.log("Testing MCP connection...\n");

  try {
    console.log("1. get_status");
    const status = await callTool("get_status");
    console.log(JSON.stringify(status, null, 2));
    console.log();

    console.log("2. get_today_matches");
    const matches = await callTool("get_today_matches");
    console.log(JSON.stringify(matches, null, 2));
    console.log();

    console.log("3. get_communities");
    const communities = await callTool("get_communities");
    console.log(JSON.stringify(communities, null, 2));
    console.log();

    console.log("All MCP calls succeeded!");
  } catch (err) {
    console.error("MCP test failed:", err);
    process.exit(1);
  } finally {
    await disconnectClient();
  }
}

main();
