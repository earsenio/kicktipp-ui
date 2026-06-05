import { Skeleton } from "@/components/ui/skeleton";

export default function BonusLoading() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="h-7 w-48 bg-muted rounded animate-pulse" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
