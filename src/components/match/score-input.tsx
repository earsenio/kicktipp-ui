// Score input widget with +/- buttons for touch and arrow-key support for keyboard.
// Accepts values 0-15. Tab navigates between home/away and to the next match.
"use client";

import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";

interface ScoreInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  modified?: boolean;
  saved?: boolean;
  isFinished?: boolean;
  tabIndex?: number;
  "aria-label"?: string;
}

export function ScoreInput({
  value,
  onChange,
  disabled = false,
  modified = false,
  saved = false,
  isFinished = false,
  tabIndex,
  "aria-label": ariaLabel,
}: ScoreInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [shake, setShake] = useState(false);

  const increment = useCallback(() => {
    if (disabled || isFinished) return;
    onChange(value === null ? 0 : Math.min(value + 1, 15));
  }, [value, onChange, disabled, isFinished]);

  const decrement = useCallback(() => {
    if (disabled || isFinished) return;
    if (value === null || value <= 0) return;
    onChange(value - 1);
  }, [value, onChange, disabled, isFinished]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      increment();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrement();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(null);
      return;
    }
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0 && n <= 15) {
      onChange(n);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-xl bg-muted border-2 border-border flex items-center justify-center font-mono text-2xl font-extrabold text-muted-foreground">
          {value !== null ? value : "-"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={increment}
        className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-all select-none"
        aria-label="Increment"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <motion.input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value ?? ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        animate={
          shake
            ? { x: [-4, 4, -4, 4, 0] }
            : saved
              ? { backgroundColor: ["var(--accent-green)", "transparent"] }
              : {}
        }
        transition={shake ? { duration: 0.3 } : { duration: 0.6 }}
        className={cn(
          "w-14 h-14 text-center font-mono text-2xl font-extrabold rounded-xl border-2 bg-muted transition-all",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          disabled && "opacity-40 cursor-not-allowed",
          modified && !saved && "border-amber-500/60",
          saved && "border-green-500/60",
          !modified && !saved && !disabled && "border-border"
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || value === null || value <= 0}
        onClick={decrement}
        className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-all select-none"
        aria-label="Decrement"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
