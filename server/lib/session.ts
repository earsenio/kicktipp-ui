// Stateless JWT session layer. User identity (email, encrypted password,
// community, player) lives in a JWE cookie. Kicktipp.com HTTP cookies
// are cached in-memory and re-established on demand after server restarts.
import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";
import { loginSession, type UserSession } from "./kicktipp.js";

// ── Secret key (lazy-loaded so dotenv runs first) ───────────────

let _secret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (!_secret) {
    const hex = process.env.SESSION_SECRET;
    if (!hex || hex.length < 64) {
      throw new Error(
        "SESSION_SECRET must be set (64 hex chars = 32 bytes). Generate with: openssl rand -hex 32"
      );
    }
    _secret = Buffer.from(hex, "hex");
  }
  return _secret;
}

// ── JWT payload shape ───────────────────────────────────────────

export interface TokenPayload {
  email: string;
  password: string;
  community: string;
  player: string;
}

// ── Ephemeral kicktipp.com cookie cache ─────────────────────────

interface CookieEntry {
  cookies: string;
  loggedIn: boolean;
}

const cookieCache = new Map<string, CookieEntry>();

// ── JWT operations ──────────────────────────────────────────────

const ALG = "dir" as const;
const ENC = "A256GCM" as const;
const EXPIRY = "24h";

export async function createToken(
  email: string,
  password: string,
  community: string,
  player: string
): Promise<string> {
  return new EncryptJWT({ email, password, community, player } as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALG, enc: ENC })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .encrypt(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtDecrypt(token, getSecret());
    const { email, password, community, player } = payload as JWTPayload & TokenPayload;
    if (!email || !password) return null;
    return { email, password, community: community || "", player: player || "" };
  } catch {
    return null;
  }
}

export async function updateToken(
  current: TokenPayload,
  updates: Partial<Pick<TokenPayload, "community" | "player">>
): Promise<string> {
  return createToken(
    current.email,
    current.password,
    updates.community ?? current.community,
    updates.player ?? current.player
  );
}

// ── Session reconstruction ──────────────────────────────────────

export async function getKicktippSession(payload: TokenPayload): Promise<UserSession> {
  const session: UserSession = {
    id: payload.email,
    email: payload.email,
    password: payload.password,
    cookies: "",
    loggedIn: false,
    community: payload.community,
    player: payload.player,
    lastActive: Date.now(),
  };

  const cached = cookieCache.get(payload.email);
  if (cached) {
    session.cookies = cached.cookies;
    session.loggedIn = cached.loggedIn;
  }

  return session;
}

export function syncCookieCache(session: UserSession): void {
  cookieCache.set(session.email, {
    cookies: session.cookies,
    loggedIn: session.loggedIn,
  });
}

export function destroyKicktippSession(email: string): void {
  cookieCache.delete(email);
}
