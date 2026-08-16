/**
 * Sign-in tracking.
 *
 * Records who tried to sign in, from what address, on what browser, and whether
 * it worked, into the login_attempts table. That is what the Security page reads.
 *
 * There was a canvas-based device fingerprinter here, feeding a column the table
 * does not have. It has been removed rather than fixed: a browser fingerprint is
 * a tracking identifier that follows a person across sites, and it was buying
 * nothing the user-agent string does not already give us for spotting somebody
 * hammering an account.
 */

import { supabase } from './supabaseClient';

// ─── IP and Location ──────────────────────────────────────────────────────────

interface LocationData {
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

/**
 * Fetches IP address and location data using a free IP geolocation service.
 * Falls back gracefully if the service is unavailable.
 */
export async function fetchLocationData(): Promise<{
  ip: string;
  location: LocationData;
}> {
  let ip = 'unknown';
  const location: LocationData = {
    country: null,
    region: null,
    city: null,
    lat: null,
    lon: null,
  };

  try {
    // Use ipapi.co (free tier: 1000 requests/day)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    if (response.ok) {
      const data = await response.json();
      ip = data.ip || 'unknown';
      location.country = data.country_name || null;
      location.region = data.region || null;
      location.city = data.city || null;
      location.lat = data.latitude || null;
      location.lon = data.longitude || null;
    }
  } catch (err) {
    console.warn('Failed to fetch location data:', err);
    // Fallback: try to get IP from a different service
    try {
      const fallback = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(3000),
      });
      if (fallback.ok) {
        const data = await fallback.json();
        ip = data.ip || 'unknown';
      }
    } catch {
      // Ignore fallback errors
    }
  }

  return { ip, location };
}

// ─── Session Tracking ─────────────────────────────────────────────────────────
//
// There used to be createUserSession / updateSessionActivity / deleteUserSession
// here, all writing to a user_sessions table that does not exist on this
// database. Every call failed into a caught-and-logged error, so the code read
// as if sessions were being tracked while nothing was recorded. Supabase Auth
// already owns the session; keeping a second copy of it bought nothing.

// ─── Login Attempt Tracking ────────────────────────────────────────────────────

/**
 * Record a sign-in attempt, successful or not.
 *
 * Every one of these used to be rejected by the database and swallowed: the
 * insert listed six columns the login_attempts table does not have
 * (device_fingerprint and five location fields), so the table has been empty
 * since it was created and the Security page had nothing to show.
 *
 * The location lookup is gone rather than restored. It sent every staff
 * member's address to a third-party geolocation service to record which city
 * a student signed in from, which is more than a school newspaper needs to
 * know about its own reporters. Who tried, from what address, on what browser,
 * and whether it worked is enough to spot someone attacking an account.
 */
export async function recordLoginAttempt(
  username: string,
  success: boolean,
  userId: string | null
): Promise<void> {
  if (!supabase) return;

  try {
    const { ip } = await fetchLocationData();

    const { error } = await supabase.from('login_attempts').insert({
      id: `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      username,
      ip,
      user_agent: navigator.userAgent,
      success,
      user_id: userId,
      timestamp: new Date().toISOString(),
    } as never);

    if (error) {
      console.error('Failed to record login attempt:', error);
    }
  } catch (err) {
    console.error('Error recording login attempt:', err);
  }
}

export interface LoginAttemptRow {
  id: string;
  username: string;
  ip: string;
  userAgent: string;
  success: boolean;
  userId: string | null;
  timestamp: string;
}

/** Recent sign-in attempts across the whole newsroom, newest first. */
export async function fetchLoginAttempts(limit = 100): Promise<LoginAttemptRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('login_attempts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as unknown as Record<string, unknown>[]).map(r => ({
      id: String(r.id),
      username: String(r.username ?? ''),
      ip: String(r.ip ?? 'unknown'),
      userAgent: String(r.user_agent ?? ''),
      success: Boolean(r.success),
      userId: (r.user_id as string) ?? null,
      timestamp: String(r.timestamp ?? ''),
    }));
  } catch {
    return [];
  }
}
