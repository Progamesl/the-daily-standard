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
  lastLogin?: string;
  createdAt?: string;
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

async function call(method: 'GET' | 'POST', body?: unknown) {
  const headers = await authHeaders();
  const res = await fetch('/api/staff', {
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
    lastLogin: (row.last_login as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
  };
}

export async function listStaff(): Promise<StaffMember[]> {
  const json = await call('GET');
  const rows = Array.isArray(json.staff) ? (json.staff as Record<string, unknown>[]) : [];
  return rows.map(fromRow);
}

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
