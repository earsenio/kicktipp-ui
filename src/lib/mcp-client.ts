import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let clientInstance: Client | null = null;
let transportInstance: StdioClientTransport | null = null;
let connectionPromise: Promise<Client> | null = null;

function getCredentials() {
  const email = process.env.KICKTIPP_EMAIL;
  const password = process.env.KICKTIPP_PASSWORD;
  if (!email || !password) {
    throw new Error("KICKTIPP_EMAIL and KICKTIPP_PASSWORD must be set");
  }
  return { email, password };
}

async function connect(): Promise<Client> {
  const { email, password } = getCredentials();

  const transport = new StdioClientTransport({
    command: "kicktipp-agent",
    env: {
      ...process.env as Record<string, string>,
      KICKTIPP_EMAIL: email,
      KICKTIPP_PASSWORD: password,
    },
  });

  const client = new Client({
    name: "kicktipp-ui",
    version: "1.0.0",
  });

  await client.connect(transport);

  transportInstance = transport;
  clientInstance = client;

  return client;
}

async function getClient(): Promise<Client> {
  if (clientInstance) return clientInstance;

  if (!connectionPromise) {
    connectionPromise = connect().catch((err) => {
      connectionPromise = null;
      clientInstance = null;
      transportInstance = null;
      throw err;
    });
  }

  return connectionPromise;
}

export async function callTool(
  name: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  const client = await getClient();
  const result = await client.callTool({ name, arguments: args });

  if (result.isError) {
    throw new Error(
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content)
    );
  }

  const content = result.content;
  if (Array.isArray(content) && content.length > 0 && content[0].type === "text") {
    try {
      return JSON.parse(content[0].text as string);
    } catch {
      return content[0].text;
    }
  }

  return content;
}

export async function disconnectClient(): Promise<void> {
  if (transportInstance) {
    await transportInstance.close();
  }
  clientInstance = null;
  transportInstance = null;
  connectionPromise = null;
}
