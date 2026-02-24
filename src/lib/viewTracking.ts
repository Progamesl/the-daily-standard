/** Client-side view tracking (localStorage). Privacy-safe: user can opt out. */

const VIEWS_KEY = "octagon_views";
const PRIVACY_NO_TRACK_KEY = "octagon_privacy_no_track";

export function isTrackingDisabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PRIVACY_NO_TRACK_KEY) === "1";
}

export function setTrackingDisabled(disabled: boolean): void {
  if (typeof window === "undefined") return;
  if (disabled) localStorage.setItem(PRIVACY_NO_TRACK_KEY, "1");
  else localStorage.removeItem(PRIVACY_NO_TRACK_KEY);
}

export function getLocalViews(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function incrementView(articleId: string): void {
  if (typeof window === "undefined" || isTrackingDisabled()) return;
  try {
    const views = getLocalViews();
    views[articleId] = (views[articleId] ?? 0) + 1;
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    // ignore
  }
}

/** Combined view count: seed data views + local views. */
export function getEffectiveViews(
  articleId: string,
  seedViews?: number
): number {
  const local = getLocalViews()[articleId] ?? 0;
  return (seedViews ?? 0) + local;
}
