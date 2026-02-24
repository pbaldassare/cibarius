import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  count?: number;
  /** "card" renders taller card-style rows, "row" renders compact rows */
  variant?: "card" | "row";
}

const ListSkeleton = ({ count = 4, variant = "card" }: ListSkeletonProps) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) =>
      variant === "card" ? (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border-2 border-accent/30 bg-card p-3"
        >
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
      ) : (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      )
    )}
  </div>
);

export default ListSkeleton;
