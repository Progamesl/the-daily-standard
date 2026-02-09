import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CardSkeleton({ variant = "default" }: { variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex gap-3 p-2">
        <Skeleton className="h-20 w-28 flex-shrink-0 rounded-lg" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
    );
  }
  return (
    <article className="rounded-xl overflow-hidden bg-card border border-border shadow-md">
      <Skeleton className="aspect-[3/2] w-full rounded-none" />
      <div className="p-4 md:p-5 space-y-3">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-5 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
    </article>
  );
}
