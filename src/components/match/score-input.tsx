"use client";

import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRef, useCallback } from "react";

interface ScoreInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  modified?: boolean;
  saved?: boolean;
  tabIndex?: number;
  "aria-label"?: string;
}

export function ScoreInput({
  value,
  onChange,
  disabled = false,
  modified = false,
  saved = false,
  tabIndex,
  "aria-label": ariaLabel,
}: ScoreInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const increment = useCallback(() => {
    if (disabled) return;
    onChange(value === null ? 0 : Math.min(value + 1, 20));
  }, [value, onChange, disabled]);

  const decrement = useCallback(() => {
    if (disabled) return;
    if (value === null || value <= 0) return;
    onChange(value - 1);
  }, [value, onChange, disabled]);

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
    if (!isNaN(n) && n >= 0 && n <= 20) {
      onChange(n);
    }
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={increment}
        className="h-6 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        aria-label="Increment"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <input
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
        className={cn(
          "h-11 w-11 text-center font-mono text-lg font-bold rounded-md border-2 bg-background transition-all",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          disabled && "opacity-40 cursor-not-allowed bg-muted",
          modified && !saved && "border-accent-amber shadow-[0_0_0_1px_var(--accent-amber)]",
          saved && "border-accent-green",
          !modified && !saved && !disabled && "border-border"
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || value === null || value <= 0}
        onClick={decrement}
        className="h-6 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        aria-label="Decrement"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
