"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MatchdayContextValue {
  activeMatchday: number;
  maxMatchday: number;
  showPills: boolean;
  setActiveMatchday: (md: number) => void;
  setMaxMatchday: (max: number) => void;
  setShowPills: (show: boolean) => void;
  onPillClick: ((md: number) => void) | null;
  setOnPillClick: (fn: ((md: number) => void) | null) => void;
}

const MatchdayContext = createContext<MatchdayContextValue | null>(null);

export function MatchdayProvider({ children }: { children: ReactNode }) {
  const [activeMatchday, setActiveMatchday] = useState(1);
  const [maxMatchday, setMaxMatchday] = useState(34);
  const [showPills, setShowPills] = useState(false);
  const [onPillClick, setOnPillClick] = useState<((md: number) => void) | null>(null);

  return (
    <MatchdayContext.Provider
      value={{
        activeMatchday, maxMatchday, showPills,
        setActiveMatchday, setMaxMatchday, setShowPills,
        onPillClick, setOnPillClick,
      }}
    >
      {children}
    </MatchdayContext.Provider>
  );
}

export function useMatchdayContext() {
  const ctx = useContext(MatchdayContext);
  if (!ctx) throw new Error("useMatchdayContext must be used within MatchdayProvider");
  return ctx;
}
