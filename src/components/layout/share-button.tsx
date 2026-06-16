"use client";

import { Share2, Check } from "lucide-react";
import { useEffect, useState } from "react";

const SHARE_TITLE = "TippKick";
const SHARE_TEXT = "Your Kicktipp pool, finally beautiful.";

export function ShareButton() {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  if (!mounted) return null;

  const handleShare = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
      } catch {
        // User dismissed the native sheet (AbortError) or it failed — ignore.
      }
      return;
    }
    // Desktop fallback: copy the link to the clipboard.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard unavailable — nothing more we can do gracefully.
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        aria-label="Share app"
      >
        <Share2 className="h-4 w-4" />
      </button>
      {copied && (
        <div className="absolute right-0 top-full mt-2 flex items-center gap-1.5 rounded-xl border border-border bg-background shadow-lg px-3 py-2 z-50 whitespace-nowrap">
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium">Link copied</span>
        </div>
      )}
    </div>
  );
}
