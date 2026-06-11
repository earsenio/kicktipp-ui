// Bottom sheet listing every player's prediction for a single (ended) match.
// Data comes from get_matchday_predictions (one fetch per matchday); we slice the
// column for this match by index. Lazy-fetches only while open.
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useKicktipp } from "@/hooks/use-kicktipp";
import type { MatchdayPredictionsResponse } from "@/lib/types";
import { cn, getInitials, gradeTip } from "@/lib/utils";
import { CountryFlag } from "@/components/shared/country-flag";
import { motion } from "framer-motion";
import { Check, Minus, X, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchday: number;
  matchIndex: number;
  home: string;
  away: string;
  result: string;
}

const gradeStyles = {
  correct: { chip: "bg-green-500/15 text-green-600 dark:text-green-400", Icon: Check },
  tendency: { chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Icon: Minus },
  wrong: { chip: "bg-red-500/15 text-red-600 dark:text-red-400", Icon: X },
} as const;

export function MatchPredictionsSheet({ open, onOpenChange, matchday, matchIndex, home, away, result }: Props) {
  const { data, loading, error } = useKicktipp<MatchdayPredictionsResponse>({
    tool: "get_matchday_predictions",
    args: { matchday },
    options: { skip: !open },
  });

  const rows = (data?.players ?? [])
    .map((p) => ({ name: p.name, position: p.position, ...(p.predictions[matchIndex] ?? { tip: null, points: null }) }))
    .filter((r) => r.tip !== null)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (parseInt(a.position) || 99) - (parseInt(b.position) || 99));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[82vh] rounded-t-2xl gap-0 p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="flex items-center justify-center gap-2.5 text-base">
            <CountryFlag country={home} size={18} className="shrink-0" />
            <span className="font-semibold truncate max-w-[34%]">{home}</span>
            <span className="font-mono font-extrabold px-2 py-0.5 rounded-lg bg-muted">{result}</span>
            <span className="font-semibold truncate max-w-[34%]">{away}</span>
            <CountryFlag country={away} size={18} className="shrink-0" />
          </SheetTitle>
          <p className="text-center text-xs text-muted-foreground mt-1">
            {rows.length} prediction{rows.length === 1 ? "" : "s"}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-[env(safe-area-inset-bottom)]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground text-center py-12">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No predictions to show.</p>
          ) : (
            rows.map((r, i) => {
              const grade = gradeTip(r.tip, result);
              const style = grade ? gradeStyles[grade] : null;
              return (
                <motion.div
                  key={`${r.name}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.2 }}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {getInitials(r.name)}
                  </div>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{r.name}</span>
                  <span className="font-mono text-sm font-bold tabular-nums">{r.tip}</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg w-[52px] justify-center shrink-0",
                      style ? style.chip : "bg-muted text-muted-foreground"
                    )}
                  >
                    {style && <style.Icon className="h-3 w-3" />}
                    {r.points ?? 0}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
