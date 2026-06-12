// Authenticated fetch wrapper. Stores the session token in localStorage and
// sends it as a Bearer header on every request. This works cross-origin in dev
// (frontend :3000, API :3001) where cookies are unreliable. localStorage (not
// sessionStorage) so the login survives tab/PWA close for the token's 24h life.
import { API_BASE } from "@/lib/utils";

const STORAGE_KEY = "kt-token";

let authToken: string | null = null;

if (typeof window !== "undefined") {
  authToken = localStorage.getItem(STORAGE_KEY);
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  const refreshed = res.headers.get("X-Token-Refresh");
  if (refreshed) setAuthToken(refreshed);
  return res;
}
