import { Suspense } from "react";
import { callTool } from "@/lib/mcp-client";
import type { OverviewResponse } from "@/lib/types";
import { OverviewContent } from "@/components/overview/overview-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

export const dynamic = "force-dynamic";

async function OverviewData() {
  let data: OverviewResponse | null = null;
  let error: string | null = null;

  try {
    data = (await callTool("get_overview")) as OverviewResponse;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load overview";
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load overview</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <OverviewContent data={data} />;
}

export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          <TableSkeleton rows={14} cols={6} />
        </div>
      }
    >
      <OverviewData />
    </Suspense>
  );
}
