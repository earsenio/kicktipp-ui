"use client";

import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Status = "connected" | "stale" | "error";

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await apiFetch("/api/kicktipp/status");
      if (res.ok) {
        setStatus("connected");
        setLastCheck(Date.now());
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(() => {
      if (lastCheck && Date.now() - lastCheck > 5 * 60_000) {
        setStatus("stale");
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [check, lastCheck]);

  const reconnect = async () => {
    setReconnecting(true);
    await check();
    setReconnecting(false);
    setShowPopover(false);
  };

  if (status === null) return null;

  const ago = lastCheck
    ? Math.round((Date.now() - lastCheck) / 60_000)
    : null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Connection status: ${status}`}
      >
        {status === "connected" ? (
          <Wifi className="h-3.5 w-3.5 text-accent-green" />
        ) : status === "stale" ? (
          <Wifi className="h-3.5 w-3.5 text-accent-amber" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-accent-red" />
        )}
      </button>

      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute right-0 top-8 z-50 w-56 rounded-lg border border-border bg-popover p-3 shadow-lg text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  status === "connected" && "bg-accent-green",
                  status === "stale" && "bg-accent-amber",
                  status === "error" && "bg-accent-red"
                )}
              />
              <span className="font-medium capitalize">{status}</span>
            </div>
            {ago !== null && (
              <p className="text-muted-foreground">
                Last connected: {ago === 0 ? "just now" : `${ago}m ago`}
              </p>
            )}
            <button
              onClick={reconnect}
              disabled={reconnecting}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3",
                  reconnecting && "animate-spin"
                )}
              />
              Reconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
