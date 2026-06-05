import { Skeleton } from "@/components/ui/skeleton";

export default function RulesLoading() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="h-7 w-24 bg-muted rounded animate-pulse" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
