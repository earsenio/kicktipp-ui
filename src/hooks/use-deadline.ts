"use client";

import { useState, useEffect } from "react";
import { isDeadlinePassed, minutesUntilKickoff } from "@/lib/utils";

export function useDeadline(kickoff: string | null | undefined) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!kickoff) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [kickoff]);

  if (!kickoff) return { isLocked: false, isApproaching: false, minutesLeft: Infinity };

  const locked = isDeadlinePassed(kickoff);
  const mins = minutesUntilKickoff(kickoff);

  // Force re-evaluation when `now` changes (consumed implicitly via the functions above)
  void now;

  return {
    isLocked: locked,
    isApproaching: !locked && mins > 0 && mins <= 30,
    minutesLeft: mins,
  };
}
