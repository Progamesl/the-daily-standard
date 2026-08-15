import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  src: string;
  alt: string;
  className?: string;
  /**
   * Natural width below which the image is dimmed slightly rather than shown at
   * full contrast. Kept only as a very light touch — see the note below.
   */
  minWidthForCover?: number;
  loading?: 'eager' | 'lazy';
  onError?: React.ReactEventHandler<HTMLImageElement>;
  /** Reports the picture's own width ÷ height once known, so a frame can match it. */
  onRatio?: (ratio: number) => void;
}

/**
 * A full-bleed image.
 *
 * An earlier version letterboxed images it judged too small, centring them over
 * a blurred copy of themselves so they'd never be enlarged. That was the wrong
 * trade for a newspaper hero: the grey pillarbox bars read as a broken layout,
 * which looks far worse than a slightly soft photo. Archive images are also
 * already served at their best available size, so the frame is filled and any
 * remaining softness is simply the limit of the original.
 *
 * The `minWidthForCover` prop is retained so callers don't break, and a very
 * small image gets a marginally softer treatment, but the frame is always
 * filled.
 */
export function SmartImage({
  src,
  alt,
  className,
  minWidthForCover = 900,
  loading = 'lazy',
  onError,
  onRatio,
}: Props) {
  const [isLowRes, setIsLowRes] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onLoad={(e) => {
        const w = e.currentTarget.naturalWidth;
        const h = e.currentTarget.naturalHeight;
        if (w && w < minWidthForCover) setIsLowRes(true);
        if (w && h) onRatio?.(w / h);
      }}
      onError={onError}
      className={cn(
        'absolute inset-0 h-full w-full object-cover',
        // A touch of blur on a genuinely tiny source reads as depth of field
        // rather than as pixelation.
        isLowRes && 'blur-[0.4px]',
        className
      )}
    />
  );
}
