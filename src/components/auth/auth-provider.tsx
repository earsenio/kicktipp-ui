// Auth context: validates the session token on mount, redirects to /login
// if missing or expired, and exposes onLogin/onLogout to the app.
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, setAuthToken, getAuthToken } from "@/lib/api";

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
    if (!getAuthToken()) {
      setLoading(false);
      if (pathname !== "/login") router.replace("/login");
      return;
    }

    let cancelled = false;
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
    return () => { cancelled = true; };
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
