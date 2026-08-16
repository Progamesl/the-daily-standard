/**
 * Staff accounts, backed by the server.
 *
 * Creating a login requires Supabase's service-role key, which must never be
 * exposed to a browser, so every operation here goes through /api/staff. That
 * endpoint re-checks the caller's session and role server-side; nothing is
 * trusted from the client.
 *
 * This replaces the old localStorage user list, where an account created on one
 * laptop existed only on that laptop.
 */

import { supabase } from '@/lib/supabaseClient';
import type { UserRole } from '@/lib/auth';

export interface StaffMember {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  section?: string;
  bio?: string;
  phone?: string;
  graduationYear?: string;
  avatar?: string;
  active: boolean;
  /** When they really last signed in, from the auth record. */
  lastLogin?: string;
  createdAt?: string;
  /** When the login itself was created, as opposed to the staff row. */
  signedUpAt?: string;
  emailConfirmedAt?: string;
  /** Set while the account is barred at the auth layer. */
  bannedUntil?: string;
  /** False unless the caller used listStaffWithSignIns. */
  hasSignInData?: boolean;
}

export interface StaffInput {
  username?: string;
  password?: string;
  displayName?: string;
  email?: string;
  role?: UserRole;
  section?: string;
  bio?: string;
  phone?: string;
  graduationYear?: string;
  avatar?: string;
  active?: boolean;
}

/** Thrown with the server's message so the UI can show something meaningful. */
export class StaffError extends Error {}

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) throw new StaffError('Not connected to the database.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new StaffError('Your session has expired. Please sign in again.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function call(method: 'GET' | 'POST', body?: unknown, query = '') {
  const headers = await authHeaders();
  const res = await fetch(`/api/staff${query}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // A non-JSON body means the function itself failed (or wasn't deployed).
    throw new StaffError(
      res.ok ? 'The server returned an unexpected response.' : `Server error (${res.status}).`
    );
  }

  if (!res.ok) throw new StaffError(String(json.error || `Request failed (${res.status}).`));
  return json;
}

function fromRow(row: Record<string, unknown>): StaffMember {
  return {
    id: String(row.id ?? ''),
    username: String(row.username ?? ''),
    displayName: String(row.display_name ?? row.username ?? ''),
    email: String(row.email ?? ''),
    role: (row.role as UserRole) ?? 'reporter',
    section: (row.section as string) ?? undefined,
    bio: (row.bio as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    graduationYear: (row.graduation_year as string) ?? undefined,
    avatar: (row.avatar as string) ?? undefined,
    active: row.active !== false,
    // admin_users.last_login is never written by anything, so prefer the real
    // one Supabase keeps. See listStaffWithSignIns.
    lastLogin: (row.lastSignInAt as string) ?? (row.last_login as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    signedUpAt: (row.signedUpAt as string) ?? undefined,
    emailConfirmedAt: (row.emailConfirmedAt as string) ?? undefined,
    bannedUntil: (row.bannedUntil as string) ?? undefined,
    // A sign-in record is only meaningful when we actually asked for one.
    hasSignInData: row.lastSignInAt !== undefined || row.signedUpAt !== undefined,
  };
}

export async function listStaff(): Promise<StaffMember[]> {
  const json = await call('GET');
  const rows = Array.isArray(json.staff) ? (json.staff as Record<string, unknown>[]) : [];
  return rows.map(fromRow);
}

/**
 * The roster plus when each person actually last signed in.
 *
 * Only the server can read that — it lives on the auth user, not in a table any
 * browser is allowed to touch — so it costs an extra lookup and is asked for
 * only by the security page, which needs it to tell a working account from one
 * a student stopped using when they graduated.
 */
export async function listStaffWithSignIns(): Promise<StaffMember[]> {
  const json = await call('GET', undefined, '?withSignIns=1');
  const rows = Array.isArray(json.staff) ? (json.staff as Record<string, unknown>[]) : [];
  return rows.map(fromRow);
}

// There is no "sign out everywhere" here on purpose — see the note in
// api/staff.js. Changing the password is what actually gets somebody off a
// device they are still holding.

export async function createStaff(input: StaffInput): Promise<void> {
  await call('POST', { action: 'create', ...input });
}

export async function updateStaff(id: string, input: StaffInput): Promise<void> {
  await call('POST', { action: 'update', id, ...input });
}

export async function resetStaffPassword(id: string, password: string): Promise<void> {
  await call('POST', { action: 'reset', id, password });
}

export async function deleteStaff(id: string): Promise<void> {
  await call('POST', { action: 'delete', id });
}
