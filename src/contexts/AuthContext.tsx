/**
 * AuthContext — Supabase-backed authentication provider
 *
 * Wraps the app and exposes user / role / loading state to any component via
 * the `useAuthContext()` hook.
 *
 * This does NOT replace AdminAuthContext yet — both can coexist while pages are
 * migrated.  AdminAuthContext still uses the localStorage-based adminUserService.
 */

import React, { createContext, useContext, type ReactNode } from 'react';
import {
  useAuth,
  type UseAuthReturn,
  type UserRole,
  type AdminProfile,
} from '@/lib/auth';
import type { User } from '@supabase/supabase-js';

// Re-export types for convenience
export type { UserRole, AdminProfile };

// ─── Context ─────────────────────────────────────────────────────────────────

interface AuthContextValue extends UseAuthReturn {}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  isConfigured: false,
  signIn: async () => 'AuthProvider not mounted',
  signOut: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Access the current Supabase auth state from any component.
 *
 * ```tsx
 * const { user, role, loading, signIn, signOut } = useAuthContext();
 * ```
 */
export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}

// For backwards-compat / named re-export
export type { User };
