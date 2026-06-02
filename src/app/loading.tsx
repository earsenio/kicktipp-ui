import { MatchCardSkeletonGrid } from "@/components/shared/loading-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      <MatchCardSkeletonGrid count={6} />
    </div>
  );
}
