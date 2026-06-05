import { TableSkeleton } from "@/components/shared/loading-skeleton";

export default function OverviewLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="h-7 w-48 bg-muted rounded animate-pulse" />
      <TableSkeleton rows={14} cols={6} />
    </div>
  );
}
