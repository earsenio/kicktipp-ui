"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RulesModal } from "@/components/rules/rules-modal";
import { FormIndicator } from "@/components/layout/form-indicator";
import { LiveBadge } from "@/components/layout/live-badge";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isLive } = useLiveRefresh([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="font-bold text-lg tracking-tight md:hidden">kicktipp</span>
        {isLive && <LiveBadge />}
      </div>

      <div className="flex items-center gap-2">
        <FormIndicator />
        <ConnectionStatus />
        <RulesModal />
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
          </Button>
        )}
      </div>
    </header>
  );
}
