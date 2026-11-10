/**
 * Small pieces of the ad workflow that the admin Ads page relies on and that
 * are worth testing on their own.
 */

/**
 * The ads table's id is a plain TEXT primary key with no default
 * (supabase/05_create_ads.sql), so an insert that leaves it out is refused
 * with a not-null error. Every new ad brings its own.
 */
export function newAdId(): string {
  return `ad_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * The form picks whole days. A bare "2026-12-31" is read by Postgres as
 * midnight UTC, which is the afternoon of the 30th in California — the ad
 * would stop a day early. Store the start and end of the day as the editor
 * means it, in their own time zone.
 */
export function adStartsAt(day: string): string | null {
  return day ? new Date(`${day}T00:00:00`).toISOString() : null;
}

export function adEndsAt(day: string): string | null {
  return day ? new Date(`${day}T23:59:59.999`).toISOString() : null;
}

/** A stored timestamp back to the day the date picker should show. */
export function adDayInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** What went wrong with a save, in words an editor can act on. */
export function adErrorMessage(error: unknown): string {
  const message = (error as { message?: string } | null)?.message ?? '';
  if (/row-level security|permission denied|not allowed/i.test(message)) {
    return 'Your account is not allowed to change ads. Sign out and back in, and ask an admin to check your account is active.';
  }
  if (/could not find the table|does not exist|schema cache/i.test(message)) {
    return 'Advertising is not set up on the database yet (see supabase/05_create_ads.sql).';
  }
  if (/jwt|token/i.test(message)) {
    return 'Your sign-in has expired. Sign in again and retry.';
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return message || 'Something went wrong. Try again.';
}
