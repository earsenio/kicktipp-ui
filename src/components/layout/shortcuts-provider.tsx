"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useState, createContext, useContext, type ReactNode } from "react";

interface ShortcutsContextValue {
  rulesOpen: boolean;
  setRulesOpen: (open: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue>({
  rulesOpen: false,
  setRulesOpen: () => {},
});

export function useShortcutsContext() {
  return useContext(ShortcutsContext);
}

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [rulesOpen, setRulesOpen] = useState(false);

  useKeyboardShortcuts({
    onOpenRules: () => setRulesOpen(true),
    onCloseModal: () => setRulesOpen(false),
  });

  return (
    <ShortcutsContext.Provider value={{ rulesOpen, setRulesOpen }}>
      {children}
    </ShortcutsContext.Provider>
  );
}
