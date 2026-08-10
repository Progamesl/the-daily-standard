/**
 * Supabase Auth Service
 *
 * Real authentication backed by Supabase Auth + admin_users table.
 * Replaces the localStorage-based auth from adminUserService.ts.
 *
 * Usage:
 *   import { useAuth } from '@/lib/auth';
 *   const { user, role, loading, signIn, signOut } = useAuth();
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { recordLoginAttempt, createUserSession, deleteUserSession } from './securityTracking';

// ─── Role types (mirrors adminUserService.ts) ────────────────────────────────

export type UserRole =
  | 'super_admin'
  | 'editor_in_chief'
  | 'managing_editor'
  | 'section_editor'
  | 'reporter'
  | 'photographer';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  editor_in_chief: 'Editor-in-Chief',
  managing_editor: 'Managing Editor',
  section_editor: 'Section Editor',
  reporter: 'Reporter',
  photographer: 'Photographer',
};

// ─── Admin profile fetched from admin_users table ────────────────────────────

export interface AdminProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  section: string | null;
  bio: string | null;
  avatar: string | null;
  active: boolean;
}

/**
 * Fetch the admin_users row that matches `authUserId`.
 * Falls back to checking by email if no id match is found.
 */
async function fetchAdminProfile(authUser: User): Promise<AdminProfile | null> {
  if (!supabase) return null;

  // Try matching by id first (id in admin_users should equal the auth user id)
  let { data, error } = await supabase
    .from('admin_users')
    .select('id, username, display_name, email, role, section, bio, avatar, active')
    .eq('id', authUser.id)
    .maybeSingle();

  // Fallback: match by email
  if (!data && !error && authUser.email) {
    ({ data, error } = await supabase
      .from('admin_users')
      .select('id, username, display_name, email, role, section, bio, avatar, active')
      .eq('email', authUser.email)
      .maybeSingle());
  }

  if (error) {
    console.error('Failed to fetch admin profile:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    email: data.email,
    role: data.role as UserRole,
    section: data.section,
    bio: data.bio,
    avatar: data.avatar,
    active: data.active,
  };
}

// ─── Core auth functions ─────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; profile: AdminProfile | null; error: string | null }> {
  if (!supabase) {
    return { user: null, profile: null, error: 'Supabase is not configured.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Security tracking is deliberately fire-and-forget: recordLoginAttempt /
  // createUserSession call an external IP-geolocation service (5s timeout), so
  // awaiting them made every sign-in — including failures — stall for seconds.
  // They swallow their own errors, so nothing here can break the login flow.

  if (error) {
    void recordLoginAttempt(email, false, null);
    return { user: null, profile: null, error: error.message };
  }

  const user = data.user;
  if (!user) {
    void recordLoginAttempt(email, false, null);
    return { user: null, profile: null, error: 'Sign-in succeeded but no user was returned.' };
  }

  const profile = await fetchAdminProfile(user);
  if (!profile) {
    // Authenticated with Supabase but has no admin_users row → not staff.
    await supabase.auth.signOut();
    void recordLoginAttempt(email, false, null);
    return {
      user: null,
      profile: null,
      error: 'This email is not set up as an Octagon staff account.',
    };
  }

  if (!profile.active) {
    await supabase.auth.signOut();
    void recordLoginAttempt(email, false, profile.id);
    return { user: null, profile: null, error: 'Your account has been deactivated.' };
  }

  void recordLoginAttempt(email, true, profile.id);

  const sessionToken = data.session?.access_token || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const expiresAt = data.session?.expires_at
    ? new Date(data.session.expires_at * 1000)
    : new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours default

  void createUserSession(profile.id, user.id, sessionToken, expiresAt);

  return { user, profile, error: null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;

  // Get current session before signing out
  const { data: { session } } = await supabase.auth.getSession();
  const sessionToken = session?.access_token;

  await supabase.auth.signOut();

  // Delete session record from Supabase
  if (sessionToken) {
    await deleteUserSession(sessionToken);
  }
}

export async function getCurrentUser(): Promise<{
  user: User | null;
  profile: AdminProfile | null;
}> {
  if (!supabase) return { user: null, profile: null };

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return { user: null, profile: null };

  const profile = await fetchAdminProfile(user);
  return { user, profile };
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return { unsubscribe: () => subscription.unsubscribe() };
}

// ─── React hook ──────────────────────────────────────────────────────────────

export interface UseAuthReturn {
  /** The Supabase Auth user (null when signed out or Supabase not configured). */
  user: User | null;
  /** The admin_users profile with role info (null when signed out). */
  profile: AdminProfile | null;
  /** Shorthand for profile.role */
  role: UserRole | null;
  /** True while the initial session check is in progress. */
  loading: boolean;
  /** True when Supabase is not configured (env vars missing). */
  isConfigured: boolean;
  /** Sign in with email + password. Returns an error string or null. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Sign out. */
  signOut: () => Promise<void>;
  /** Re-fetch the admin_users profile for the current session. */
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  // ── Initial session check ──────────────────────────────────────────────────
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getCurrentUser().then(({ user: u, profile: p }) => {
      if (cancelled) return;
      setUser(u);
      setProfile(p);
      setLoading(false);
    });

    // Listen for auth state changes (e.g. token refresh, sign-out in another tab)
    const { unsubscribe } = onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(session.user);

      // Refresh admin profile
      const p = await fetchAdminProfile(session.user);
      if (!cancelled) setProfile(p);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSignIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const result = await signIn(email, password);
    if (result.error) return result.error;
    setUser(result.user);
    setProfile(result.profile);
    return null;
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const handleRefresh = useCallback(async () => {
    const { user: u, profile: p } = await getCurrentUser();
    setUser(u);
    setProfile(p);
  }, []);

  return {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    isConfigured: configured,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refresh: handleRefresh,
  };
}
