import type { ImgHTMLAttributes } from "react";

export interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** When true, load immediately (e.g. LCP hero). Default false = lazy. */
  eager?: boolean;
}

/**
 * img with loading=lazy and decoding=async by default; set eager for above-the-fold hero.
 */
export function OptimizedImage({ eager = false, loading, decoding, ...props }: OptimizedImageProps) {
  return (
    <img
      loading={loading ?? (eager ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      {...props}
    />
  );
}
