"use client";

import { useState } from "react";
import type { BonusQuestion, LeaderboardResponse } from "@/lib/types";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-table";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronUp, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useDeadline } from "@/hooks/use-deadline";

interface SelectState {
  [questionIdx: number]: {
    [selectIdx: number]: string;
  };
}

interface Props {
  questions: BonusQuestion[];
  deadline: string | null;
  bonusLeaderboard: LeaderboardResponse | null;
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      className="flex-1 py-3 px-3 rounded-xl text-center"
      style={{
        background: `${color}12`,
        border: `1.5px solid ${color}30`,
      }}
    >
      <div className="font-mono text-xl font-extrabold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
    </div>
  );
}

function BonusQuestionCard({
  question,
  index,
  selections,
  onSelect,
  disabled,
}: {
  question: BonusQuestion;
  index: number;
  selections: Record<number, string>;
  onSelect: (selectIdx: number, value: string) => void;
  disabled?: boolean;
}) {
  const [openSelect, setOpenSelect] = useState<number | null>(null);

  return (
    <div className="rounded-2xl bg-card border-[1.5px] border-border p-4 flex flex-col gap-3 shrink-0">
      {/* Question header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-px bg-primary/15 text-primary">
            {index + 1}
          </div>
          <span className="text-sm font-semibold leading-snug text-foreground">
            {question.question}
          </span>
        </div>
      </div>

      {/* Select dropdowns */}
      {question.selects.map((s, si) => {
        const currentVal = selections[si] || "-1";
        const selectedOption = s.options.find((o) => o.value === currentVal);
        const displayText = selectedOption?.text || "Select answer...";
        const isOpen = openSelect === si;

        return (
          <div key={si}>
            <button
              onClick={() => !disabled && setOpenSelect(isOpen ? null : si)}
              disabled={disabled}
              className={cn(
                "w-full px-3 py-2.5 rounded-xl bg-muted border text-sm flex items-center justify-between transition-colors text-left",
                disabled && "opacity-50 cursor-not-allowed",
                !disabled && isOpen
                  ? "border-primary/50"
                  : currentVal !== "-1"
                    ? "border-primary/30"
                    : "border-border",
                currentVal !== "-1" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="truncate">{displayText}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 rounded-xl border border-primary/20 bg-popover overflow-hidden shadow-lg">
                    {s.options
                      .filter((o) => o.text !== "-- Select --")
                      .map((opt) => {
                        const isSelected = currentVal === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              onSelect(si, opt.value);
                              setOpenSelect(null);
                            }}
                            className={cn(
                              "w-full px-3 py-2.5 text-sm text-left flex items-center justify-between border-b border-border last:border-0 transition-colors",
                              isSelected
                                ? "text-primary font-semibold bg-primary/10"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <span>{opt.text}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function BonusContent({ questions, deadline, bonusLeaderboard }: Props) {
  const [tab, setTab] = useState<"questions" | "ranking">("questions");
  const { isLocked: deadlinePassed, isApproaching: deadlineApproaching, minutesLeft } = useDeadline(deadline);
  const [origSelections] = useState<SelectState>(() => {
    const init: SelectState = {};
    questions.forEach((q, qi) => {
      init[qi] = {};
      q.selects.forEach((s, si) => {
        init[qi][si] = s.selected;
      });
    });
    return init;
  });
  const [selections, setSelections] = useState<SelectState>(() => {
    const copy: SelectState = {};
    for (const [qi, qSels] of Object.entries(origSelections)) {
      copy[Number(qi)] = { ...qSels };
    }
    return copy;
  });
  const [submitting, setSubmitting] = useState(false);

  const answered = questions.filter((q, qi) =>
    q.selects.some((_, si) => {
      const val = selections[qi]?.[si];
      return val && val !== "-1";
    })
  ).length;

  const hasChanges = questions.some((q, qi) =>
    q.selects.some((s, si) => selections[qi]?.[si] !== origSelections[qi]?.[si])
  );

  const handleChange = (qi: number, si: number, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [qi]: { ...prev[qi], [si]: value },
    }));
  };

  const handleSubmit = async () => {
    const bets: string[] = [];
    questions.forEach((q, qi) => {
      q.selects.forEach((s, si) => {
        const val = selections[qi]?.[si];
        if (val && val !== "-1" && val !== origSelections[qi]?.[si]) {
          bets.push(`${s.name}=${val}`);
        }
      });
    });

    if (bets.length === 0) {
      toast.info("No changes to submit");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/kicktipp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "place_bonus_bets",
          args: { bets },
          skipCache: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`${bets.length} bonus bet${bets.length > 1 ? "s" : ""} submitted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full -m-4 md:-m-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bonus</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {questions.length} questions
          </p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-border">
          <button
            className={cn(
              "px-4 py-2 text-xs font-bold transition-all",
              tab === "questions"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab("questions")}
          >
            Questions
          </button>
          <button
            className={cn(
              "px-4 py-2 text-xs font-bold transition-all",
              tab === "ranking"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab("ranking")}
          >
            Ranking
          </button>
        </div>
      </div>

      {tab === "questions" ? (
        <>
          {/* Deadline banner */}
          {deadlinePassed && (
            <div className="mx-4 mt-1 mb-1 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm font-semibold text-red-500">Deadline has passed</span>
            </div>
          )}
          {!deadlinePassed && deadlineApproaching && (
            <div className="mx-4 mt-1 mb-1 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Deadline in {minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-2 px-4 py-2 pb-3">
            <StatBox value={`${answered}/${questions.length}`} label="answered" color="#2563eb" />
          </div>

          {/* Question cards */}
          <div className="flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-3 scrollbar-hide">
            {questions.map((q, qi) => (
              <motion.div
                key={qi}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qi * 0.03 }}
              >
                <BonusQuestionCard
                  question={q}
                  index={qi}
                  selections={selections[qi] || {}}
                  onSelect={(si, val) => handleChange(qi, si, val)}
                  disabled={deadlinePassed}
                />
              </motion.div>
            ))}
          </div>

          {/* Submit bar */}
          <div className="px-4 py-3 shrink-0 border-t border-border">
            <button
              onClick={handleSubmit}
              disabled={deadlinePassed || (!hasChanges && !submitting)}
              className={cn(
                "w-full rounded-xl py-3.5 text-sm font-bold transition-all",
                deadlinePassed
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : hasChanges || submitting
                    ? "bg-primary text-primary-foreground cursor-pointer shadow-lg shadow-primary/25"
                    : "bg-muted text-muted-foreground cursor-default"
              )}
            >
              {deadlinePassed ? (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" />
                  Deadline Passed
                </span>
              ) : submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : hasChanges ? (
                "Submit Bonus Bets"
              ) : (
                "No Changes to Submit"
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {bonusLeaderboard ? (
            <LeaderboardPodium rankings={bonusLeaderboard.rankings} overview={null} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Bonus leaderboard not available yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
