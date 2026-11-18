import { Skeleton } from "@/components/Skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="layout-container section-spacing space-y-8">
      <Skeleton className="h-24 w-full max-w-xl" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
