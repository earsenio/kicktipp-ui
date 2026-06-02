import { MatchCardSkeletonGrid } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MatchdayLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-10 w-[160px] rounded" />
        <Skeleton className="h-10 w-10 rounded" />
      </div>
      <Skeleton className="h-4 w-64" />
      <MatchCardSkeletonGrid count={8} />
    </div>
  );
}
