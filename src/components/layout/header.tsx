"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { LiveBadge } from "@/components/layout/live-badge";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MatchdayPills } from "@/components/shared/matchday-pills";
import { useMatchdayContext } from "@/components/match/matchday-context";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isLive } = useLiveRefresh([]);
  const { showPills, activeMatchday, maxMatchday, onPillClick } = useMatchdayContext();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-white/[0.06] bg-background/80 backdrop-blur-sm fixed top-0 left-0 right-0 md:left-56 z-40">
      <div className="h-14 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-lg tracking-tight md:hidden">kicktipp</span>
          {isLive && <LiveBadge />}
        </div>

        <div className="flex items-center gap-2">
          <ConnectionStatus />
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-full bg-white/[0.04] flex items-center justify-center text-white/50 hover:text-white/80 transition-all"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === "dark" ? (
                  <motion.span
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="h-4 w-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="h-4 w-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>

      {showPills && (
        <MatchdayPills
          current={activeMatchday}
          max={maxMatchday}
          onChange={(md) => onPillClick?.(md)}
        />
      )}
    </header>
  );
}
