import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const globalStore = globalThis as typeof globalThis & {
  __mcpClient?: Client;
  __mcpTransport?: StdioClientTransport;
  __mcpConnectionPromise?: Promise<Client>;
  __mcpQueue?: Promise<unknown>;
  __mcpInflight?: Map<string, Promise<unknown>>;
  __mcpCleanupRegistered?: boolean;
};

if (!globalStore.__mcpQueue) globalStore.__mcpQueue = Promise.resolve();
if (!globalStore.__mcpInflight) globalStore.__mcpInflight = new Map();

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
  if (globalStore.__mcpCleanupRegistered) return;
  globalStore.__mcpCleanupRegistered = true;

  const cleanup = () => {
    if (globalStore.__mcpTransport) {
      try {
        globalStore.__mcpTransport.close();
      } catch {}
    }
    globalStore.__mcpClient = undefined;
    globalStore.__mcpTransport = undefined;
    globalStore.__mcpConnectionPromise = undefined;
  };

  process.on("exit", cleanup);
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
}

async function connect(): Promise<Client> {
  const { email, password } = getCredentials();

  if (globalStore.__mcpTransport) {
    try {
      await globalStore.__mcpTransport.close();
    } catch {}
    globalStore.__mcpTransport = undefined;
    globalStore.__mcpClient = undefined;
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

  globalStore.__mcpTransport = transport;
  globalStore.__mcpClient = client;

  registerCleanup();

  return client;
}

async function getClient(): Promise<Client> {
  if (globalStore.__mcpClient) return globalStore.__mcpClient;

  if (!globalStore.__mcpConnectionPromise) {
    globalStore.__mcpConnectionPromise = connect().catch((err) => {
      globalStore.__mcpConnectionPromise = undefined;
      globalStore.__mcpClient = undefined;
      globalStore.__mcpTransport = undefined;
      throw err;
    });
  }

  return globalStore.__mcpConnectionPromise;
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
      if (process.env.NODE_ENV === "development") {
        console.error(`[MCP] ${name} attempt ${attempt + 1} failed:`, lastError.message);
      }
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
      globalStore.__mcpClient = undefined;
      globalStore.__mcpTransport = undefined;
      globalStore.__mcpConnectionPromise = undefined;
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
  const inflight = globalStore.__mcpInflight!;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = new Promise<unknown>((resolve, reject) => {
    globalStore.__mcpQueue = globalStore.__mcpQueue!.then(
      () => callToolInner(name, args).then(resolve, reject),
      () => callToolInner(name, args).then(resolve, reject)
    );
  });

  inflight.set(key, promise);
  promise.finally(() => inflight.delete(key));

  return promise;
}

export async function disconnectClient(): Promise<void> {
  if (globalStore.__mcpTransport) {
    await globalStore.__mcpTransport.close();
  }
  globalStore.__mcpClient = undefined;
  globalStore.__mcpTransport = undefined;
  globalStore.__mcpConnectionPromise = undefined;
}
