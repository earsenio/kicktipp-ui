import { Suspense } from "react";
import { callTool } from "@/lib/mcp-client";
import type { TableResponse } from "@/lib/types";
import { TableContent } from "@/components/table/table-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

export const dynamic = "force-dynamic";

async function TableData() {
  let data: TableResponse | null = null;
  let error: string | null = null;

  try {
    data = (await callTool("get_table")) as TableResponse;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load table";
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load table</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <TableContent initialData={data} />;
}

export default function TablePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          <TableSkeleton rows={10} cols={6} />
        </div>
      }
    >
      <TableData />
    </Suspense>
  );
}
