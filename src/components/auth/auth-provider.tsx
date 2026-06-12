// Auth context: validates the session token on mount, redirects to /login
// if missing or expired, and exposes onLogin/onLogout to the app.
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, setAuthToken } from "@/lib/api";

interface AuthState {
  email: string | null;
  community: string | null;
  loading: boolean;
  onLogin: (data: { email: string; community: string; token: string }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  email: null,
  community: null,
  loading: true,
  onLogin: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [community, setCommunity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    // Always validate against the server: it accepts either the Bearer token
    // (localStorage) or the httpOnly cookie, so a valid session keeps us signed
    // in even when local storage was cleared (e.g. fresh PWA launch). apiFetch
    // also picks up any rolling-renewal token from X-Token-Refresh.
    async function check() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        if (!cancelled) {
          setEmail(data.email);
          setCommunity(data.community);
        }
      } catch {
        setAuthToken(null);
        if (!cancelled && pathname !== "/login") {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();

    // Re-validate (and slide the session) when the user returns to the app —
    // important for installed PWAs that stay mounted across long backgrounding.
    function onVisible() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogin = useCallback((data: { email: string; community: string; token: string }) => {
    setAuthToken(data.token);
    setEmail(data.email);
    setCommunity(data.community);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setAuthToken(null);
    setEmail(null);
    setCommunity(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ email, community, loading, onLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
