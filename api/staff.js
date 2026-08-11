/**
 * Staff account management — server-side, privileged.
 *
 * Creating a login requires Supabase's service-role key, which must never
 * reach the browser. So account management runs here, on Vercel, where the key
 * already lives in the project environment.
 *
 * Every request is authorised twice:
 *   1. The caller must present a valid Supabase access token (they are signed
 *      into the CMS).
 *   2. That token's user must be an ACTIVE admin_users row whose role is
 *      senior enough to manage staff (editor_in_chief or super_admin).
 *
 * Routes (all on /api/staff):
 *   GET                      → list staff
 *   POST   {action:'create'} → create a login + staff profile
 *   POST   {action:'update'} → change display name / role / section / active
 *   POST   {action:'reset'}  → set a new password for a staff member
 *   POST   {action:'delete'} → remove the login and the staff profile
 */

import { createClient } from '@supabase/supabase-js';

// Mirrors ROLE_LEVEL in src/lib/adminUserService.ts
const ROLE_LEVEL = {
  super_admin: 6,
  editor_in_chief: 5,
  managing_editor: 4,
  section_editor: 3,
  reporter: 2,
  photographer: 1,
};
const MANAGE_USERS_LEVEL = 5;

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Resolve the caller from their bearer token, or return an error string. */
async function authorize(req, db) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return { error: 'Not signed in.', status: 401 };

  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return { error: 'Your session has expired. Sign in again.', status: 401 };

  const { data: profile } = await db
    .from('admin_users')
    .select('id, role, active, display_name')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || !profile.active) {
    return { error: 'This account is not an active staff account.', status: 403 };
  }
  return { caller: profile };
}

function canManage(caller) {
  return (ROLE_LEVEL[caller.role] || 0) >= MANAGE_USERS_LEVEL;
}

/** A caller may only act on someone strictly below them (or on themselves). */
function outranks(caller, targetRole) {
  return (ROLE_LEVEL[caller.role] || 0) > (ROLE_LEVEL[targetRole] || 0);
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({
      error:
        'Staff management is not configured on this deployment (missing SUPABASE_SERVICE_ROLE_KEY).',
    });
  }

  const db = admin();

  const auth = await authorize(req, db);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { caller } = auth;

  // ── List ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('admin_users')
      .select(
        'id, username, display_name, email, role, section, bio, phone, graduation_year, avatar, active, last_login, created_at'
      )
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ staff: data || [], callerRole: caller.role });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    action, id, email, password, displayName, username, role, section, active,
    bio, phone, graduationYear, avatar,
  } = req.body || {};

  if (!canManage(caller)) {
    return res
      .status(403)
      .json({ error: 'Only an editor-in-chief or super admin can manage staff accounts.' });
  }

  // ── Create ────────────────────────────────────────────────────────────────
  if (action === 'create') {
    if (!email || !password || !displayName || !role) {
      return res.status(400).json({ error: 'Email, password, name and role are all required.' });
    }
    if (!ROLE_LEVEL[role]) return res.status(400).json({ error: 'Unknown role.' });
    if (!outranks(caller, role)) {
      return res.status(403).json({ error: "You can't create an account at or above your own role." });
    }
    if (String(password).length < 10) {
      return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    }

    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      email_confirm: true, // no inbox round-trip; an editor is creating this
    });
    if (createErr) return res.status(400).json({ error: createErr.message });

    const authId = created.user.id;
    const handle =
      (username && String(username).trim()) ||
      String(email).split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 30);

    const { error: rowErr } = await db.from('admin_users').insert({
      id: authId,
      username: handle,
      password_hash: 'managed_by_supabase_auth',
      display_name: String(displayName).trim(),
      email: String(email).trim().toLowerCase(),
      role,
      section: section || null,
      bio: bio || null,
      phone: phone || null,
      graduation_year: graduationYear || null,
      avatar: avatar || null,
      active: true,
      email_verified: true,
      approved_by: caller.display_name || caller.id,
      approved_at: new Date().toISOString(),
    });

    if (rowErr) {
      // Don't strand an orphaned login with no staff profile.
      await db.auth.admin.deleteUser(authId).catch(() => {});
      return res.status(400).json({ error: rowErr.message });
    }

    return res.status(200).json({ ok: true, id: authId });
  }

  if (!id) return res.status(400).json({ error: 'Missing account id.' });

  const { data: target } = await db
    .from('admin_users')
    .select('id, role, display_name')
    .eq('id', id)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: 'That staff account no longer exists.' });

  const isSelf = target.id === caller.id;
  if (!isSelf && !outranks(caller, target.role)) {
    return res.status(403).json({ error: "You can't modify an account at or above your own role." });
  }

  // ── Update ────────────────────────────────────────────────────────────────
  if (action === 'update') {
    const patch = { updated_at: new Date().toISOString() };
    if (displayName !== undefined) patch.display_name = String(displayName).trim();
    if (username !== undefined) patch.username = String(username).trim();
    if (email !== undefined) patch.email = String(email).trim().toLowerCase();
    if (section !== undefined) patch.section = section || null;
    if (bio !== undefined) patch.bio = bio || null;
    if (phone !== undefined) patch.phone = phone || null;
    if (graduationYear !== undefined) patch.graduation_year = graduationYear || null;
    if (avatar !== undefined) patch.avatar = avatar || null;
    if (role !== undefined) {
      if (!ROLE_LEVEL[role]) return res.status(400).json({ error: 'Unknown role.' });
      if (isSelf) return res.status(403).json({ error: "You can't change your own role." });
      if (!outranks(caller, role)) {
        return res.status(403).json({ error: "You can't promote someone to your own role or above." });
      }
      patch.role = role;
    }
    if (active !== undefined) {
      if (isSelf && active === false) {
        return res.status(403).json({ error: "You can't deactivate your own account." });
      }
      patch.active = Boolean(active);
    }

    const { error } = await db.from('admin_users').update(patch).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // ── Reset password ────────────────────────────────────────────────────────
  if (action === 'reset') {
    if (!password || String(password).length < 10) {
      return res.status(400).json({ error: 'New password must be at least 10 characters.' });
    }
    const { error } = await db.auth.admin.updateUserById(id, { password: String(password) });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  if (action === 'delete') {
    if (isSelf) return res.status(403).json({ error: "You can't delete your own account." });
    const { error: rowErr } = await db.from('admin_users').delete().eq('id', id);
    if (rowErr) return res.status(400).json({ error: rowErr.message });
    await db.auth.admin.deleteUser(id).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}
