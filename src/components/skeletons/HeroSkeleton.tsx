import { Skeleton } from "@/components/ui/skeleton";

export function HeroSkeleton() {
  return (
    <section className="w-full relative overflow-hidden" aria-hidden>
      <div className="relative w-full aspect-[21/9] sm:aspect-[2.35/1] overflow-hidden bg-muted">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 lg:p-12">
          <div className="flow-container">
            <div className="max-w-4xl space-y-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-10 w-full max-w-2xl rounded" />
              <Skeleton className="h-6 w-full max-w-xl rounded" />
              <Skeleton className="h-5 w-48 rounded" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
