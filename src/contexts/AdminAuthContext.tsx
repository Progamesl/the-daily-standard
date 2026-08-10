/**
 * AdminAuthContext — the gate for /admin.
 *
 * This is now backed by REAL Supabase Auth (src/lib/auth.ts + AuthContext),
 * not the old localStorage session. The public shape is deliberately kept
 * close to the previous version so every admin page keeps working unchanged
 * (`isAuthenticated`, `currentUser`, `logout`, `refreshUser`).
 *
 * What changed and why it matters:
 *  - `login()` is now async and takes an EMAIL (Supabase Auth identity) and
 *    returns an error message, or null on success.
 *  - `loading` is new and MUST be respected before redirecting. Restoring a
 *    Supabase session is asynchronous, so on first render there is no user yet;
 *    redirecting on `!isAuthenticated` alone would bounce a signed-in editor to
 *    the login page on every page load.
 *  - Identity now lives in Supabase, so accounts are shared across devices and
 *    browsers instead of being seeded per-browser in localStorage.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/auth';

/** The signed-in staff member, as admin pages consume it. */
export interface AdminSessionUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  section?: string;
  bio?: string;
  avatar?: string;
  active: boolean;
}

interface AdminAuthState {
  isAuthenticated: boolean;
  /** True while the Supabase session is being restored. Gate redirects on this. */
  loading: boolean;
  /** False when Supabase env vars are missing (auth cannot work at all). */
  isConfigured: boolean;
  currentUser: AdminSessionUser | null;
  /** Sign in with email + password. Resolves to an error message, or null on success. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  /** Re-read the current user's profile (e.g. after editing their own account). */
  refreshUser: () => void;
}

const AdminAuthContext = createContext<AdminAuthState>({
  isAuthenticated: false,
  loading: true,
  isConfigured: false,
  currentUser: null,
  login: async () => 'Auth provider is not mounted.',
  logout: async () => {},
  refreshUser: () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  // Consume the AuthProvider mounted in main.tsx rather than calling useAuth()
  // again — a second call would open a duplicate auth subscription.
  const { profile, loading, isConfigured, signIn, signOut, refresh } = useAuthContext();

  const currentUser = useMemo<AdminSessionUser | null>(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username || profile.email,
      email: profile.email,
      role: profile.role,
      section: profile.section ?? undefined,
      bio: profile.bio ?? undefined,
      avatar: profile.avatar ?? undefined,
      active: profile.active,
    };
  }, [profile]);

  const value = useMemo<AdminAuthState>(
    () => ({
      isAuthenticated: Boolean(currentUser?.active),
      loading,
      isConfigured,
      currentUser,
      login: signIn,
      logout: signOut,
      refreshUser: () => void refresh(),
    }),
    [currentUser, loading, isConfigured, signIn, signOut, refresh]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
