"use client";

import { useState } from "react";
import type { BonusQuestion, LeaderboardResponse } from "@/lib/types";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-table";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SelectState {
  [questionIdx: number]: {
    [selectIdx: number]: string;
  };
}

interface Props {
  questions: BonusQuestion[];
  bonusLeaderboard: LeaderboardResponse | null;
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      className="flex-1 py-2.5 px-2 rounded-xl text-center"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      <div className="font-mono text-xl font-extrabold" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] text-white/35 font-medium mt-0.5">{label}</div>
    </div>
  );
}

function BonusQuestionCard({
  question,
  index,
  selections,
  onSelect,
}: {
  question: BonusQuestion;
  index: number;
  selections: Record<number, string>;
  onSelect: (selectIdx: number, value: string) => void;
}) {
  const [openSelect, setOpenSelect] = useState<number | null>(null);

  return (
    <div className="rounded-[14px] bg-white/[0.03] border border-white/[0.05] p-3.5 flex flex-col gap-2.5 shrink-0">
      {/* Question header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div
            className={cn(
              "w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-px",
              "bg-white/[0.05] text-white/30"
            )}
          >
            {index + 1}
          </div>
          <span className="text-[13px] font-semibold leading-snug">
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
              onClick={() => setOpenSelect(isOpen ? null : si)}
              className={cn(
                "w-full px-3 py-2.5 rounded-[10px] bg-white/[0.03] border text-xs flex items-center justify-between transition-colors text-left",
                isOpen
                  ? "border-primary/50"
                  : currentVal !== "-1"
                    ? "border-primary/30"
                    : "border-white/[0.06]",
                currentVal !== "-1" ? "text-foreground" : "text-white/30"
              )}
            >
              <span className="truncate">{displayText}</span>
              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-white/30 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-white/30 shrink-0" />
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
                  <div className="mt-1 rounded-[10px] border border-primary/20 bg-[#1a1a24] overflow-hidden">
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
                              "w-full px-3 py-2.5 text-xs text-left flex items-center justify-between border-b border-white/[0.03] last:border-0 transition-colors",
                              isSelected
                                ? "text-primary font-semibold bg-primary/10"
                                : "text-white/70 hover:bg-white/[0.03]"
                            )}
                          >
                            <span>{opt.text}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
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

export function BonusContent({ questions, bonusLeaderboard }: Props) {
  const [tab, setTab] = useState<"questions" | "ranking">("questions");
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
  const [selections, setSelections] = useState<SelectState>(() => ({ ...origSelections }));
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
          const option = s.options.find((o) => o.value === val);
          if (option) {
            bets.push(`${q.question}=${option.text}`);
          }
        }
      });
    });

    if (bets.length === 0) {
      toast.info("No changes to submit");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kicktipp", {
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
      <div className="px-4 pt-3 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Bonus</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {questions.length} questions
          </p>
        </div>
        <div className="flex rounded-[10px] overflow-hidden border border-white/[0.08]">
          <button
            className={cn(
              "px-3.5 py-1.5 text-[11px] font-semibold transition-all",
              tab === "questions"
                ? "bg-primary text-white"
                : "text-white/40 hover:text-white/60"
            )}
            onClick={() => setTab("questions")}
          >
            Questions
          </button>
          <button
            className={cn(
              "px-3.5 py-1.5 text-[11px] font-semibold transition-all",
              tab === "ranking"
                ? "bg-primary text-white"
                : "text-white/40 hover:text-white/60"
            )}
            onClick={() => setTab("ranking")}
          >
            Ranking
          </button>
        </div>
      </div>

      {tab === "questions" ? (
        <>
          {/* Stats row */}
          <div className="flex gap-2 px-4 py-2 pb-3">
            <StatBox value={`${answered}/${questions.length}`} label="answered" color="#3b82f6" />
          </div>

          {/* Question cards */}
          <div className="flex-1 overflow-y-auto px-4 pb-3 flex flex-col gap-2 scrollbar-hide">
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
                />
              </motion.div>
            ))}
          </div>

          {/* Submit bar */}
          <div className="px-4 py-2.5 shrink-0">
            <button
              onClick={handleSubmit}
              disabled={!hasChanges && !submitting}
              className={cn(
                "w-full rounded-xl py-3.5 text-sm font-bold transition-all",
                hasChanges || submitting
                  ? "bg-primary text-white cursor-pointer"
                  : "bg-white/[0.04] text-white/20 cursor-default"
              )}
            >
              {submitting ? (
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
            <p className="text-sm text-white/40 text-center py-8">
              Bonus leaderboard not available yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
