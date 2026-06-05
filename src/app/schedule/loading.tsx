import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-36" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded" />
        <Skeleton className="h-9 w-24 rounded" />
        <Skeleton className="h-9 w-48 rounded ml-auto" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-10 w-full rounded" />
          {Array.from({ length: 4 }, (_, j) => (
            <div key={j} className="flex gap-3 p-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
