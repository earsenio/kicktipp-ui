import { Suspense } from "react";
import { callTool } from "@/lib/mcp-client";
import type { ScheduleResponse } from "@/lib/types";
import { ScheduleContent } from "@/components/schedule/schedule-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

export const dynamic = "force-dynamic";

async function ScheduleData() {
  let data: ScheduleResponse | null = null;
  let error: string | null = null;

  try {
    data = (await callTool("get_schedule")) as ScheduleResponse;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load schedule";
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

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          <TableSkeleton rows={8} cols={4} />
        </div>
      }
    >
      <ScheduleData />
    </Suspense>
  );
}
