/**
 * Image helpers for The Octagon — only saccdsoctagon.org / octagon.scdsstudent.org images.
 * No Unsplash, no Google Drive, no stock. Returns null when no valid image (never a placeholder).
 */

export const SITE_PLACEHOLDER = '/placeholder.svg';

function isBadUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || url.length < 10) return true;
  const u = url.toLowerCase();
  return (
    u.includes('placeholder') ||
    u.includes('unsplash.com') ||
    u.includes('wayback') ||
    u.includes('archive.org') ||
    u.includes('thekeyworldwide.com') ||
    u.includes('world business') ||
    u.includes('a_black_image') ||
    u.includes('black_image')
  );
}

export function isOwnPublication(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return (
    u.includes('saccdsoctagon.org') ||
    u.includes('octagon.scdsstudent.org') ||
    u.includes('wp-content/uploads')
  );
}

/**
 * Returns a usable image URL or null. Checks primary image first, then fallback list.
 * Only returns URLs that actually look like real images. Never returns the placeholder.
 */
export function getImageOrNull(
  primaryImage?: string,
  fallbackImages?: string[]
): string | null {
  if (primaryImage && !isBadUrl(primaryImage)) return primaryImage;
  if (Array.isArray(fallbackImages)) {
    for (const url of fallbackImages) {
      if (url && !isBadUrl(url)) return url;
    }
  }
  return null;
}

/**
 * Legacy wrapper — returns image URL or SITE_PLACEHOLDER. Used by components that
 * always need *some* src (like onError fallback). Prefer getImageOrNull for filtering.
 */
export function enhanceArticleImage(
  originalImage: string,
  _headline?: string,
  _section?: string,
  _dek?: string,
  fallbackImages?: string[]
): string {
  return getImageOrNull(originalImage, fallbackImages) ?? SITE_PLACEHOLDER;
}
