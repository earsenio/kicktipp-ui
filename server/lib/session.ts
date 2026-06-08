// In-memory session store. Each login creates a UserSession keyed by a random UUID.
// Sessions are evicted after 24 hours of inactivity (no persistent storage).
import { randomUUID } from "crypto";
import { loginSession, type UserSession } from "./kicktipp.js";

const sessions = new Map<string, UserSession>();

const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export function getSession(id: string): UserSession | null {
  const session = sessions.get(id);
  if (!session) return null;
  // Touch: reset idle timer on every access
  session.lastActive = Date.now();
  return session;
}

export async function createSession(email: string, password: string): Promise<UserSession> {
  const session: UserSession = {
    id: randomUUID(),
    email,
    password,
    cookies: "",
    loggedIn: false,
    community: "",
    player: "",
    lastActive: Date.now(),
  };

  await loginSession(session);
  sessions.set(session.id, session);
  return session;
}

export function destroySession(id: string): boolean {
  return sessions.delete(id);
}

export function sessionCount(): number {
  return sessions.size;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActive > IDLE_TIMEOUT_MS) {
      sessions.delete(id);
      console.log(`[session] Evicted idle session`);
    }
  }
}, 60 * 60 * 1000);
