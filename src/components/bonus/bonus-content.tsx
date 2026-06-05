"use client";

import { useState } from "react";
import type { BonusQuestion, LeaderboardResponse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { toast } from "sonner";
import { Loader2, Save, Star, HelpCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SelectState {
  [questionIdx: number]: {
    [selectIdx: number]: string;
  };
}

interface Props {
  questions: BonusQuestion[];
  bonusLeaderboard: LeaderboardResponse | null;
}

export function BonusContent({ questions, bonusLeaderboard }: Props) {
  const [selections, setSelections] = useState<SelectState>(() => {
    const initial: SelectState = {};
    questions.forEach((q, qi) => {
      initial[qi] = {};
      q.selects.forEach((s, si) => {
        initial[qi][si] = s.selected;
      });
    });
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);

  const hasChanges = questions.some((q, qi) =>
    q.selects.some((s, si) => selections[qi]?.[si] !== s.selected)
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
        if (val && val !== "-1" && val !== s.selected) {
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
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonus</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">
            <HelpCircle className="h-3.5 w-3.5" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No bonus questions available.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {questions.map((q, qi) => (
                  <motion.div
                    key={qi}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: qi * 0.03 }}
                  >
                    <Card className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <h3 className="text-sm font-semibold">{q.question}</h3>
                      </div>
                      <div className="space-y-2 pl-6">
                        {q.selects.map((s, si) => {
                          const currentVal = selections[qi]?.[si] || "-1";
                          const isModified = currentVal !== s.selected;
                          return (
                            <Select
                              key={si}
                              value={currentVal}
                              onValueChange={(v) =>
                                handleChange(qi, si, v ?? "-1")
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-full",
                                  isModified && "border-accent-amber"
                                )}
                              >
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="-1">-- Select --</SelectItem>
                                {s.options.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.text}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {hasChanges && (
                <div className="sticky bottom-20 md:bottom-4 z-10 mt-4">
                  <Card className="p-3 bg-background/95 backdrop-blur-sm border-primary">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Submit Bonus Bets
                    </Button>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="leaderboard">
          {bonusLeaderboard ? (
            <LeaderboardTable
              rankings={bonusLeaderboard.rankings}
              overview={null}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Bonus leaderboard not available yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
