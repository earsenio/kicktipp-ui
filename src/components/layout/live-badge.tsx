"use client";

export function LiveBadge() {
  return (
    <div
      className="flex items-center gap-1.5 text-[10px] font-medium text-accent-red uppercase tracking-wider"
      aria-live="polite"
      role="status"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red" />
      </span>
      Live
    </div>
  );
}
