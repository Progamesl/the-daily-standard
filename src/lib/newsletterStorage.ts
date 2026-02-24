/** Client-side only. Newsletter preferences (no backend). */

const KEY = "octagon_newsletter_prefs";

export type NewsletterFrequency = "daily" | "weekly";

export interface NewsletterPrefs {
  email: string;
  frequency: NewsletterFrequency;
  sections: string[];
  subscribedAt: string; // ISO
}

export function getNewsletterPrefs(): NewsletterPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NewsletterPrefs;
  } catch {
    return null;
  }
}

export function setNewsletterPrefs(prefs: NewsletterPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function hasNewsletterSubscription(): boolean {
  return getNewsletterPrefs() != null;
}
