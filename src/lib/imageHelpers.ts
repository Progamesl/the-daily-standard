/**
 * Image helpers for The Octagon — launch/official: use only real content from data.
 * No Unsplash or stock imagery; single site fallback when image is missing or invalid.
 */

/** Single site fallback when article has no image or URL is invalid/broken. */
export const SITE_PLACEHOLDER = '/placeholder.svg';

/** Consider URL "fake" or invalid for official launch (do not use). */
function isPlaceholderOrFake(url: string): boolean {
  if (!url || typeof url !== 'string' || url.length < 10) return true;
  const u = url.toLowerCase();
  return (
    u.includes('placeholder') ||
    u.includes('unsplash.com') ||
    u.includes('wayback') ||
    u.includes('archive.org') ||
    u.includes('thekeyworldwide.com') ||
    u.includes('world business')
  );
}

/**
 * Use the article's real image from data. When primary image is fake/missing,
 * uses first real URL from fallbackImages (e.g. article.images from body).
 * Only falls back to site placeholder when no valid image is found.
 */
export function enhanceArticleImage(
  originalImage: string,
  _headline?: string,
  _section?: string,
  _dek?: string,
  fallbackImages?: string[]
): string {
  if (!isPlaceholderOrFake(originalImage)) return originalImage;
  if (Array.isArray(fallbackImages)) {
    for (const url of fallbackImages) {
      if (url && !isPlaceholderOrFake(url)) return url;
    }
  }
  return SITE_PLACEHOLDER;
}
