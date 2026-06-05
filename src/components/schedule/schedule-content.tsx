"use client";

import { useState, useMemo } from "react";
import type { ScheduleResponse } from "@/lib/types";
import { ScheduleList } from "./schedule-list";
import { ScheduleCalendar } from "./schedule-calendar";
import { Button } from "@/components/ui/button";
import { List, CalendarDays, Search } from "lucide-react";

type ViewMode = "list" | "calendar";
type StatusFilter = "all" | "upcoming" | "completed";

export function parseMatchDate(dateStr: string): Date | null {
  const m = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, day, month, year, hour, min] = m;
  return new Date(
    2000 + parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(min)
  );
}

export function ScheduleContent({ data }: { data: ScheduleResponse }) {
  const [view, setView] = useState<ViewMode>("list");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let matches = data.matches;
    if (search) {
      const q = search.toLowerCase();
      matches = matches.filter(
        (m) =>
          m.home.toLowerCase().includes(q) ||
          m.away.toLowerCase().includes(q)
      );
    }
    if (status !== "all") {
      matches = matches.filter((m) =>
        status === "completed" ? m.result !== "-:-" : m.result === "-:-"
      );
    }
    return matches;
  }, [data.matches, search, status]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight">
        {data.title || "Schedule"}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <Button
            variant={view === "list" ? "default" : "ghost"}
            size="sm"
            className="rounded-none gap-1.5"
            onClick={() => setView("list")}
          >
            <List className="h-3.5 w-3.5" />
            List
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "ghost"}
            size="sm"
            className="rounded-none gap-1.5"
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Button>
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "upcoming", "completed"] as const).map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "ghost"}
              size="sm"
              className="rounded-none capitalize"
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <div className="relative sm:ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-48 rounded-lg border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} match{filtered.length !== 1 ? "es" : ""}
        {status !== "all" && ` (${status})`}
        {search && ` matching "${search}"`}
      </p>

      {view === "list" ? (
        <ScheduleList matches={filtered} />
      ) : (
        <ScheduleCalendar matches={filtered} />
      )}
    </div>
  );
}
