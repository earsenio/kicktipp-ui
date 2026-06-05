"use client";

import type { ScheduleResponse } from "@/lib/types";
import { ScheduleContent } from "@/components/schedule/schedule-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useKicktipp } from "@/hooks/use-kicktipp";

export default function SchedulePage() {
  const { data, loading, error } = useKicktipp<ScheduleResponse>({
    tool: "get_schedule",
  });

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <TableSkeleton rows={8} cols={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load schedule</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <ScheduleContent data={data} />;
}
