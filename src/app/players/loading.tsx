import { LeaderboardSkeleton } from "@/components/shared/loading-skeleton";

export default function PlayersLoading() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="h-7 w-28 bg-muted rounded animate-pulse" />
      <LeaderboardSkeleton rows={10} />
    </div>
  );
}
