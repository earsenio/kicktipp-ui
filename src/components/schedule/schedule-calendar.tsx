"use client";

import { useState, useMemo } from "react";
import type { ScheduleMatch } from "@/lib/types";
import { parseMatchDate } from "./schedule-content";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6;

  const days: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, inMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), inMonth: false });
    }
  }
  return days;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ScheduleCalendar({ matches }: { matches: ScheduleMatch[] }) {
  const matchDates = useMemo(() => {
    const map = new Map<string, ScheduleMatch[]>();
    for (const m of matches) {
      const d = parseMatchDate(m.date);
      if (!d) continue;
      const key = dateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [matches]);

  const allDates = useMemo(() => {
    const dates: Date[] = [];
    for (const m of matches) {
      const d = parseMatchDate(m.date);
      if (d) dates.push(d);
    }
    return dates;
  }, [matches]);

  const initialMonth = allDates.length > 0 ? allDates[0] : new Date();
  const [year, setYear] = useState(initialMonth.getFullYear());
  const [month, setMonth] = useState(initialMonth.getMonth());
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const todayKey = dateKey(new Date());

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">{monthLabel}</span>
        <Button variant="ghost" size="icon" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs text-muted-foreground font-medium py-1"
          >
            {d}
          </div>
        ))}
        {days.map(({ date, inMonth }, i) => {
          const key = dateKey(date);
          const dayMatches = matchDates.get(key) || [];
          const isToday = key === todayKey;
          const hasMatches = dayMatches.length > 0;
          const allPlayed = dayMatches.every((m) => m.result !== "-:-");
          const isHovered = hoveredDay === key;

          return (
            <div
              key={i}
              className={cn(
                "relative min-h-[48px] p-1 text-center border border-border/30 rounded-sm transition-colors",
                !inMonth && "opacity-30",
                isToday && "ring-1 ring-primary",
                hasMatches && "cursor-pointer hover:bg-muted/40"
              )}
              onMouseEnter={() => hasMatches && setHoveredDay(key)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <span
                className={cn(
                  "text-xs",
                  isToday && "font-bold text-primary"
                )}
              >
                {date.getDate()}
              </span>
              {hasMatches && (
                <div className="flex justify-center gap-0.5 mt-1">
                  {dayMatches.slice(0, 4).map((m, j) => (
                    <div
                      key={j}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        m.result !== "-:-"
                          ? "bg-accent-green"
                          : "bg-accent-blue"
                      )}
                    />
                  ))}
                  {dayMatches.length > 4 && (
                    <span className="text-[8px] text-muted-foreground">
                      +{dayMatches.length - 4}
                    </span>
                  )}
                </div>
              )}

              {isHovered && dayMatches.length > 0 && (
                <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1 w-52 bg-popover border border-border rounded-lg shadow-lg p-2 text-left">
                  {dayMatches.map((m, j) => (
                    <div
                      key={j}
                      className="text-xs py-0.5 flex items-center gap-1"
                    >
                      <span className="truncate">{m.home}</span>
                      <span className="font-mono font-bold shrink-0">
                        {m.result === "-:-" ? "vs" : m.result}
                      </span>
                      <span className="truncate">{m.away}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          Upcoming
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          Played
        </div>
      </div>
    </Card>
  );
}
