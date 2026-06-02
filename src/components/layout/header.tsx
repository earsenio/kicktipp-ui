"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/kicktipp/status")
      .then((r) => setConnected(r.ok))
      .catch(() => setConnected(false));
  }, []);

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="font-bold text-lg tracking-tight md:hidden">kicktipp</span>
      </div>

      <div className="flex items-center gap-2">
        {connected !== null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-accent-green" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-accent-red" />
            )}
          </div>
        )}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
