"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from "@/lib/utils";

interface UseKicktippOptions<T> {
  tool: string;
  args?: Record<string, unknown>;
  options?: {
    refreshInterval?: number;
    skip?: boolean;
  };
}

interface UseKicktippResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useKicktipp<T>({
  tool,
  args,
  options,
}: UseKicktippOptions<T>): UseKicktippResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const argsKey = args ? JSON.stringify(args) : "";
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/kicktipp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json.data as T);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, argsKey]);

  useEffect(() => {
    if (options?.skip) return;
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData, options?.skip]);

  useEffect(() => {
    if (options?.skip || !options?.refreshInterval) return;
    intervalRef.current = setInterval(fetchData, options.refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, options?.skip, options?.refreshInterval]);

  return { data, error, loading, refresh: fetchData };
}
