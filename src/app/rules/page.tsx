"use client";

import type { RulesSection } from "@/lib/types";
import { RulesContent } from "@/components/rules/rules-content";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useKicktipp } from "@/hooks/use-kicktipp";

export default function RulesPage() {
  const { data, loading, error } = useKicktipp<RulesSection[]>({
    tool: "get_rules",
  });

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <TableSkeleton rows={8} cols={3} />
      </div>
    );
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
