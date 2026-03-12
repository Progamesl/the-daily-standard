/**
 * Security Tracking Utilities
 *
 * Tracks IP, device fingerprint (HWID), and location for all user sessions
 * and login attempts. All data is stored in Supabase (never localStorage).
 */

import { supabase } from './supabaseClient';

// ─── Device Fingerprinting ────────────────────────────────────────────────────

/**
 * Generates a device fingerprint (HWID) based on browser/device characteristics.
 * This is a hash that uniquely identifies a device/browser combination.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return 'unknown';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 2, 2);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.hardwareConcurrency || 'unknown',
    navigator.deviceMemory || 'unknown',
    canvas.toDataURL(),
  ].join('|');

  // Simple hash function (for production, consider using crypto.subtle)
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 32);
}

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

/**
 * Creates a new session record in Supabase when a user signs in.
 * Tracks IP, device fingerprint, and location.
 */
export async function createUserSession(
  userId: string,
  authUserId: string | null,
  sessionToken: string,
  expiresAt: Date
): Promise<void> {
  if (!supabase) return;

  try {
    const fingerprint = await generateDeviceFingerprint();
    const { ip, location } = await fetchLocationData();

    const { error } = await supabase.from('user_sessions').insert({
      user_id: userId,
      auth_user_id: authUserId,
      ip_address: ip,
      user_agent: navigator.userAgent,
      device_fingerprint: fingerprint,
      location_country: location.country,
      location_region: location.region,
      location_city: location.city,
      location_lat: location.lat,
      location_lon: location.lon,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      console.error('Failed to create user session:', error);
    }
  } catch (err) {
    console.error('Error creating user session:', err);
  }
}

/**
 * Updates the last_activity timestamp for a session.
 */
export async function updateSessionActivity(sessionToken: string): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Failed to update session activity:', error);
    }
  } catch (err) {
    console.error('Error updating session activity:', err);
  }
}

/**
 * Deletes a session record (on sign out).
 */
export async function deleteUserSession(sessionToken: string): Promise<void> {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Failed to delete user session:', error);
    }
  } catch (err) {
    console.error('Error deleting user session:', err);
  }
}

// ─── Login Attempt Tracking ────────────────────────────────────────────────────

/**
 * Records a login attempt with full security metadata (IP, device, location).
 */
export async function recordLoginAttempt(
  username: string,
  success: boolean,
  userId: string | null
): Promise<void> {
  if (!supabase) return;

  try {
    const fingerprint = await generateDeviceFingerprint();
    const { ip, location } = await fetchLocationData();

    const { error } = await supabase.from('login_attempts').insert({
      id: `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      username,
      ip,
      user_agent: navigator.userAgent,
      device_fingerprint: fingerprint,
      location_country: location.country,
      location_region: location.region,
      location_city: location.city,
      location_lat: location.lat,
      location_lon: location.lon,
      success,
      user_id: userId,
    });

    if (error) {
      console.error('Failed to record login attempt:', error);
    }
  } catch (err) {
    console.error('Error recording login attempt:', err);
  }
}
