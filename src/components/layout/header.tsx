"use client";

import { Download } from "lucide-react";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { ShareButton } from "@/components/layout/share-button";
import { LiveBadge } from "@/components/layout/live-badge";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useEffect, useState, useRef } from "react";
import { MatchdayPills } from "@/components/shared/matchday-pills";
import { useMatchdayContext } from "@/components/match/matchday-context";
import { useAuth } from "@/components/auth/auth-provider";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const { isLive } = useLiveRefresh([]);
  const { showPills, activeMatchday, maxMatchday, onPillClick } = useMatchdayContext();
  const { community } = useAuth();
  const { canInstall, isStandalone, isIOS, isMac, promptInstall } = useInstallPrompt();
  const [showInstallTip, setShowInstallTip] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showInstallTip) return;
    const onClickOutside = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setShowInstallTip(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showInstallTip]);

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
    } else {
      setShowInstallTip((v) => !v);
    }
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm fixed top-0 left-0 right-0 md:left-56 z-40">
      <div className="h-14 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-lg tracking-tight md:hidden">TippKick</span>
          {community && (
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[160px]">
              {community}
            </span>
          )}
          {isLive && <LiveBadge />}
        </div>

        <div className="flex items-center gap-2">
          {mounted && !isStandalone && (
            <div className="relative" ref={tipRef}>
              <button
                onClick={handleInstallClick}
                className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                aria-label="Install app"
              >
                <Download className="h-4 w-4" />
              </button>
              {showInstallTip && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-background shadow-lg p-3 z-50">
                  {isIOS ? (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Add to Home Screen</p>
                      <p className="text-xs text-muted-foreground">
                        Tap the <span className="inline-flex items-center"><svg className="inline h-4 w-4 mx-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span> Share button, then select <strong>&quot;Add to Home Screen&quot;</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Bookmark this app</p>
                      <p className="text-xs text-muted-foreground">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[11px] font-mono">{isMac ? "Cmd" : "Ctrl"}+D</kbd> to bookmark for quick access
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <ConnectionStatus />
          <ShareButton />
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
