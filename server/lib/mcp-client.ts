import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let mcpClient: Client | undefined;
let mcpTransport: StdioClientTransport | undefined;
let connectionPromise: Promise<Client> | undefined;
let queue: Promise<unknown> = Promise.resolve();
const inflight = new Map<string, Promise<unknown>>();

const CALL_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];

function getCredentials() {
  const email = process.env.KICKTIPP_EMAIL;
  const password = process.env.KICKTIPP_PASSWORD;
  if (!email || !password) {
    throw new Error("KICKTIPP_EMAIL and KICKTIPP_PASSWORD must be set");
  }
  return { email, password };
}

function registerCleanup() {
  const cleanup = () => {
    if (mcpTransport) {
      try { mcpTransport.close(); } catch {}
    }
    mcpClient = undefined;
    mcpTransport = undefined;
    connectionPromise = undefined;
  };

  process.on("exit", cleanup);
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
}

let cleanupRegistered = false;

async function connect(): Promise<Client> {
  const { email, password } = getCredentials();

  if (mcpTransport) {
    try { await mcpTransport.close(); } catch {}
    mcpTransport = undefined;
    mcpClient = undefined;
  }

  const transport = new StdioClientTransport({
    command: "kicktipp-mcp",
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

  mcpTransport = transport;
  mcpClient = client;

  if (!cleanupRegistered) {
    registerCleanup();
    cleanupRegistered = true;
  }

  return client;
}

async function getClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  if (!connectionPromise) {
    connectionPromise = connect().catch((err) => {
      connectionPromise = undefined;
      mcpClient = undefined;
      mcpTransport = undefined;
      throw err;
    });
  }

  return connectionPromise;
}

function inflightKey(name: string, args?: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return name;
  return `${name}:${JSON.stringify(args)}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`MCP call timed out after ${ms / 1000}s`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function executeCall(
  client: Client,
  name: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await withTimeout(
        client.callTool({ name, arguments: args ?? {} }),
        CALL_TIMEOUT_MS
      );

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
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }

  throw lastError!;
}

async function callToolInner(
  name: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  let client = await getClient();

  try {
    return await executeCall(client, name, args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Not connected") || msg.includes("EPIPE") || msg.includes("ECONNRESET")) {
      mcpClient = undefined;
      mcpTransport = undefined;
      connectionPromise = undefined;
      client = await getClient();
      return executeCall(client, name, args);
    }
    throw err;
  }
}

export async function callTool(
  name: string,
  args?: Record<string, unknown>
): Promise<unknown> {
  const key = inflightKey(name, args);

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = new Promise<unknown>((resolve, reject) => {
    queue = queue.then(
      () => callToolInner(name, args).then(resolve, reject),
      () => callToolInner(name, args).then(resolve, reject)
    );
  });

  inflight.set(key, promise);
  promise.finally(() => inflight.delete(key));

  return promise;
}
