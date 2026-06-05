import { Suspense } from "react";
import { callTool } from "@/lib/mcp-client";
import type { RulesSection } from "@/lib/types";
import { RulesContent } from "@/components/rules/rules-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

export const dynamic = "force-dynamic";

async function RulesData() {
  let data: RulesSection[] | null = null;
  let error: string | null = null;

  try {
    data = (await callTool("get_rules")) as RulesSection[];
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load rules";
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-bold mb-2">Failed to load rules</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return <RulesContent sections={data} />;
}

export default function RulesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <TableSkeleton rows={8} cols={3} />
        </div>
      }
    >
      <RulesData />
    </Suspense>
  );
}
