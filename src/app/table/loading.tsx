import { TableSkeleton } from "@/components/shared/loading-skeleton";

export default function TableLoading() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="h-7 w-36 bg-muted rounded animate-pulse" />
      <TableSkeleton rows={10} cols={8} />
    </div>
  );
}
