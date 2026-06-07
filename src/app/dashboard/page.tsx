"use client";

import type { TodayMatchesResponse, KicktippStatus } from "@/lib/types";
import { DashboardContent } from "@/components/dashboard-content";
import { MatchCardSkeletonGrid } from "@/components/shared/loading-skeleton";
import { useKicktipp } from "@/hooks/use-kicktipp";

export default function DashboardPage() {
  const { data: status, loading: statusLoading, error: statusError } = useKicktipp<KicktippStatus>({
    tool: "get_status",
  });
  const { data: matches, loading: matchesLoading } = useKicktipp<TodayMatchesResponse>({
    tool: "get_today_matches",
    options: { skip: !status || status.setup_needed },
  });

  if (statusLoading || matchesLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <MatchCardSkeletonGrid count={4} />
      </div>
    );
  }

  if (statusError || !status) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground mb-4">{statusError || "Unable to connect"}</p>
        <a href="/setup" className="text-sm underline text-accent-blue">
          Go to Setup
        </a>
      </div>
    );
  }

  if (status.setup_needed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Welcome to Kicktipp</h2>
        <p className="text-muted-foreground mb-4">{status.setup_instructions}</p>
        <a
          href="/setup"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
        >
          Complete Setup
        </a>
      </div>
    );
  }

  return <DashboardContent matches={matches} />;
}
