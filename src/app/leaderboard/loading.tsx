import { Skeleton } from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-10 w-[160px] rounded" />
        <Skeleton className="h-10 w-10 rounded" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded" />
        <Skeleton className="h-9 w-24 rounded" />
      </div>
      <div className="space-y-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 ml-auto" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
