"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { ReactNode } from "react";

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}
