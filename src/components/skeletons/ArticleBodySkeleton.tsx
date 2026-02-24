import { Skeleton } from "@/components/ui/skeleton";

export function ArticleBodySkeleton() {
  return (
    <div className="flow-container max-w-3xl mx-auto py-8 space-y-6">
      <Skeleton className="h-8 w-3/4 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-32 w-full rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-4/5 rounded" />
    </div>
  );
}
