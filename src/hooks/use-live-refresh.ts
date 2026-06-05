"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const POLL_INTERVAL = 60_000;

export function useLiveRefresh(tools: string[]): {
  isLive: boolean;
  refresh: () => void;
  refreshing: boolean;
} {
  const [isLive, setIsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toolsKey = tools.join(",");

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      for (const tool of tools) {
        await fetch("/api/kicktipp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool, skipCache: true }),
        });
      }
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsKey]);

  useEffect(() => {
    let cancelled = false;

    async function checkLive() {
      try {
        const res = await fetch("/api/kicktipp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "get_today_matches" }),
        });
        const json = await res.json();
        if (cancelled) return;

        const matches = json.data?.matches ?? [];
        const now = Date.now();
        const hasLive = matches.some((m: { time?: string }) => {
          if (!m.time) return false;
          const kickoff = new Date(m.time).getTime();
          if (isNaN(kickoff)) return false;
          return kickoff < now && now - kickoff < 3 * 60 * 60 * 1000;
        });
        setIsLive(hasLive);
      } catch {
        setIsLive(false);
      }
    }

    const initialDelay = setTimeout(checkLive, 5000);
    const check = setInterval(checkLive, 5 * 60_000);
    return () => {
      cancelled = true;
      clearTimeout(initialDelay);
      clearInterval(check);
    };
  }, []);

  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(doRefresh, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, doRefresh]);

  return { isLive, refresh: doRefresh, refreshing };
}
