// Polls for score updates during live matches. Detects whether any match
// is currently in progress and starts a 60-second refresh interval.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { getMatchStatus } from "@/lib/utils";

const POLL_INTERVAL = 60_000;

interface LiveMatch {
  kickoff?: string;
  result?: string;
  ended?: boolean;
}

export function useLiveRefresh(
  tools: string[],
  onData?: (tool: string, data: unknown) => void
): {
  isLive: boolean;
  refresh: () => void;
  refreshing: boolean;
} {
  const [isLive, setIsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toolsKey = tools.join(",");
  // Keep the latest onData without retriggering the polling effect.
  const onDataRef = useRef(onData);
  useEffect(() => { onDataRef.current = onData; }, [onData]);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      for (const tool of tools) {
        const res = await apiFetch("/api/kicktipp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool, skipCache: true }),
        });
        if (!res.ok) continue;
        const json = await res.json();
        onDataRef.current?.(tool, json.data);
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
        const res = await apiFetch("/api/kicktipp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: "get_today_matches" }),
        });
        const json = await res.json();
        if (cancelled) return;

        const matches: LiveMatch[] = json.data?.matches ?? [];
        const hasLive = matches.some(
          (m) => getMatchStatus(m.kickoff, m.result, m.ended) === "live"
        );
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
