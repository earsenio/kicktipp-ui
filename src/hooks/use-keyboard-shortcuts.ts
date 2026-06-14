// Keyboard shortcuts: G+key chords for navigation (G+P = predictions,
// G+L = leaderboard, etc.) and R to refresh the current page data.
"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, string> = {
  d: "/",
  m: "/matchday/1",
  l: "/leaderboard",
  o: "/overview",
  b: "/bonus",
  p: "/players",
};

export function useKeyboardShortcuts({
  onRefresh,
}: {
  onRefresh?: () => void;
} = {}) {
  const router = useRouter();
  const gPressed = useRef(false);
  const gTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "r" && !e.ctrlKey && !e.metaKey && !gPressed.current) {
        e.preventDefault();
        onRefresh?.();
        return;
      }

      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        gPressed.current = true;
        if (gTimeout.current) clearTimeout(gTimeout.current);
        gTimeout.current = setTimeout(() => {
          gPressed.current = false;
        }, 1000);
        return;
      }

      if (gPressed.current) {
        gPressed.current = false;
        if (gTimeout.current) clearTimeout(gTimeout.current);
        const route = ROUTES[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
      }
    },
    [router, onRefresh]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gTimeout.current) clearTimeout(gTimeout.current);
    };
  }, [handleKeyDown]);
}
