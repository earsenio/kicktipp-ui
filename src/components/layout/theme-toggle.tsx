"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  // "icon" = circular icon button (top bar / sidebar).
  // "row" = full-width icon + label row (mobile "More" drawer).
  variant?: "icon" | "row";
  // Optional callback fired after toggling (e.g. close the drawer).
  onToggle?: () => void;
}

export function ThemeToggle({ variant = "icon", onToggle }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";
  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
    onToggle?.();
  };

  const icon = (
    <AnimatePresence mode="wait" initial={false}>
      {isDark ? (
        <motion.span
          key="sun"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Sun className={variant === "row" ? "h-5 w-5" : "h-4 w-4"} />
        </motion.span>
      ) : (
        <motion.span
          key="moon"
          initial={{ rotate: 90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: -90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Moon className={variant === "row" ? "h-5 w-5" : "h-4 w-4"} />
        </motion.span>
      )}
    </AnimatePresence>
  );

  if (variant === "row") {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-colors text-muted-foreground hover:bg-muted hover:text-foreground w-full"
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        <span className="shrink-0">{icon}</span>
        <div className="text-sm font-semibold">
          {isDark ? "Light mode" : "Dark mode"}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {icon}
    </button>
  );
}
