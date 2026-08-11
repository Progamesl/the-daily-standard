import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  src: string;
  alt: string;
  className?: string;
  /**
   * Below this natural width the image is treated as too small to fill its
   * container. Roughly: the widest this image will ever be asked to render.
   */
  minWidthForCover?: number;
  loading?: 'eager' | 'lazy';
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * An image that refuses to be enlarged past what it can carry.
 *
 * Around 30% of the archive is under 1200px wide — some as small as 300px —
 * because that is how it was saved on the old WordPress site. Stretching one of
 * those across a full-bleed hero is a 2-4x upscale, and the browser's crude
 * scaling turns it to mush. The pixels aren't recoverable, so the fix is to
 * stop demanding them.
 *
 * When an image is big enough it fills the frame normally. When it isn't, it is
 * shown at its true proportions and centred over a blurred, enlarged copy of
 * itself — the frame stays full-bleed, the photo stays sharp, and the result
 * reads as deliberate rather than broken.
 *
 * The check uses the real decoded width at load time, so it also covers images
 * uploaded later whose size nobody recorded.
 */
export function SmartImage({
  src,
  alt,
  className,
  minWidthForCover = 1200,
  loading = 'lazy',
  onError,
}: Props) {
  const [tooSmall, setTooSmall] = useState(false);

  return (
    <>
      {tooSmall && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={(e) => {
          const w = e.currentTarget.naturalWidth;
          if (w && w < minWidthForCover) setTooSmall(true);
        }}
        onError={onError}
        className={cn(
          'absolute inset-0 h-full w-full',
          tooSmall ? 'object-contain' : 'object-cover',
          className
        )}
      />
    </>
  );
}
