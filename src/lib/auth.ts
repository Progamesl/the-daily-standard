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
import { recordLoginAttempt } from './securityTracking';

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

  const columns = 'id, username, display_name, email, role, section, bio, avatar, active';

  // Try matching by id first (id in admin_users should equal the auth user id)
  let { data, error } = await supabase
    .from('admin_users').select(columns).eq('id', authUser.id).maybeSingle();

  // Fallback: match by email
  if (!data && !error && authUser.email) {
    ({ data, error } = await supabase
      .from('admin_users').select(columns).eq('email', authUser.email).maybeSingle());
  }

  // One retry on a transient failure.
  //
  // Returning null here means "this person is not staff", and the callers act
  // on that by signing them out. A dropped connection or a lock contention
  // inside the auth library therefore threw editors back to the login page
  // mid-edit. A genuine "no such row" comes back as no data and no error, and
  // is not retried.
  if (error) {
    console.warn('Could not read the staff account, retrying:', error.message);
    await new Promise(r => setTimeout(r, 350));
    ({ data, error } = await supabase
      .from('admin_users').select(columns).eq('id', authUser.id).maybeSingle());
    if (!data && !error && authUser.email) {
      ({ data, error } = await supabase
        .from('admin_users').select(columns).eq('email', authUser.email).maybeSingle());
    }
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
  void logToNewsroom('login', `${profile.displayName} signed in`, profile.id, profile.displayName);

  // There is no session bookkeeping of our own. There used to be a call here
  // writing to a user_sessions table, but that table does not exist on this
  // database, so every write failed into a swallowed error. Supabase Auth
  // already owns the session — a second copy of it was never doing anything.

  return { user, profile, error: null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { profile } = await getCurrentUser();
  if (profile) {
    void logToNewsroom('logout', `${profile.displayName} signed out`, profile.id, profile.displayName);
  }
  await supabase.auth.signOut();
}

/**
 * Add a line to the shared activity log.
 *
 * Signing in and out were never recorded anywhere: the only code that logged
 * them belonged to the retired localStorage login flow, which nothing calls.
 * Imported lazily because adminUserService reaches back into this module.
 */
async function logToNewsroom(action: string, description: string, userId: string, displayName: string) {
  try {
    const { logActivity } = await import('./adminUserService');
    logActivity(action, description, userId, undefined, displayName);
  } catch { /* logging must never break signing in */ }
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

/**
 * The session already stored in this browser, without asking the server.
 *
 * Deciding whether to show the admin or the sign-in page must not depend on a
 * network round trip. getUser() calls the auth server every time, so on a slow
 * or flaky connection the admin sat on "Loading your newsroom…" waiting for it;
 * getSession() reads what is already on the machine and returns immediately.
 * The token is still verified by the database on the very next query.
 */
export async function getStoredSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session ?? null;
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
  //
  // This is the gate the whole admin waits behind, so its one hard rule is that
  // it must always open. Two separate faults used to leave it shut forever,
  // showing "Loading your newsroom…" until the tab was closed:
  //
  //  1. The profile was fetched with `await` INSIDE the onAuthStateChange
  //     callback. The auth library holds its initialisation lock while it
  //     dispatches that callback, and a database query needs the same lock to
  //     attach the session — so the callback waited on itself. It only bites
  //     when a session already exists, which is exactly why a private window
  //     worked and a normal one hung: a private window has nothing stored, so
  //     the callback returns early and never makes the query.
  //
  //  2. loading was only cleared in .then(). No .catch(), no .finally(), no
  //     timeout — so the moment anything above stalled or threw, the spinner
  //     was permanent.
  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let settled = false;

    const open = () => {
      if (cancelled || settled) return;
      settled = true;
      setLoading(false);
    };

    // Whatever else happens, stop saying "loading" and let people see either the
    // newsroom or the sign-in page. A wrong answer they can act on beats a
    // spinner they cannot.
    const watchdog = setTimeout(() => {
      if (!cancelled && !settled) {
        console.warn('Auth took too long to settle; showing the sign-in page.');
        open();
      }
    }, 8000);

    getStoredSession()
      .then(async session => {
        if (cancelled) return;
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          return;
        }
        setUser(session.user);
        const p = await fetchAdminProfile(session.user);
        if (!cancelled) setProfile(p);
      })
      .catch(err => {
        console.error('Could not restore your session:', err);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      })
      .finally(() => {
        clearTimeout(watchdog);
        open();
      });

    // Later changes: signing in, signing out, or a sign-out in another tab.
    const { unsubscribe } = onAuthStateChange((event, session) => {
      if (cancelled) return;

      // INITIAL_SESSION is the event the block above already handles.
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        open();
        return;
      }

      setUser(session.user);

      // A refreshed token is the same person; only re-read the profile when
      // the identity actually changed.
      if (event !== 'SIGNED_IN' && event !== 'USER_UPDATED') return;

      // Deferred out of the callback on purpose — see the note above. Anything
      // awaiting Supabase in here deadlocks against the lock this callback is
      // holding, and setTimeout is what gets us out from under it.
      setTimeout(async () => {
        if (cancelled) return;
        try {
          const p = await fetchAdminProfile(session.user);
          if (!cancelled) setProfile(p);
        } catch (err) {
          console.error('Could not read your staff account:', err);
        } finally {
          open();
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
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
