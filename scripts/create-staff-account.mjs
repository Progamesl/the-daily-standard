/**
 * Create (or repair) an Octagon staff account.
 *
 * Creating a login is a privileged operation, so this reads the service-role
 * key from ../.supabase-admin.local — a gitignored file that is NOT committed.
 * Nothing secret is ever printed.
 *
 *   node scripts/create-staff-account.mjs
 *       → uses the OCTAGON_ADMIN_* values from that file, as super_admin
 *
 *   node scripts/create-staff-account.mjs --email a@b.com --password "…" \
 *        --name "Jane Doe" --role reporter --username jane
 *
 * Safe to re-run: an existing login has its password reset and its staff
 * profile repaired rather than being duplicated.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECRETS = path.join(HERE, '..', '.supabase-admin.local');

const VALID_ROLES = [
  'super_admin',
  'editor_in_chief',
  'managing_editor',
  'section_editor',
  'reporter',
  'photographer',
];

// ── Load the gitignored secrets file ────────────────────────────────────────
function loadEnvFile(file) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${path.basename(file)} — fill it in first.`);
    process.exit(1);
  }
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

// ── CLI args override the file ──────────────────────────────────────────────
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const env = loadEnvFile(SECRETS);
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is empty in .supabase-admin.local');
  process.exit(1);
}

// Derive the project URL from the key itself, so there is nothing else to set.
let ref, keyRole;
try {
  const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
  ref = payload.ref;
  keyRole = payload.role;
} catch {
  console.error('That does not look like a Supabase key (could not decode it).');
  process.exit(1);
}

if (keyRole !== 'service_role') {
  console.error(
    `That key has role "${keyRole}", not "service_role". Copy the key marked "secret" ` +
      '(Project Settings → API Keys → service_role), not the anon/publishable one.'
  );
  process.exit(1);
}

const url = env.SUPABASE_URL || `https://${ref}.supabase.co`;

const email = (arg('email') || env.OCTAGON_ADMIN_EMAIL || '').trim().toLowerCase();
const password = arg('password') || env.OCTAGON_ADMIN_PASSWORD || '';
const displayName = arg('name') || env.OCTAGON_ADMIN_NAME || '';
const role = arg('role') || 'super_admin';
const username =
  arg('username') || env.OCTAGON_ADMIN_USERNAME || email.split('@')[0].replace(/[^a-z0-9._-]/gi, '');

if (!email || !password || !displayName) {
  console.error('Need an email, password and name (in the file or via --flags).');
  process.exit(1);
}
if (!VALID_ROLES.includes(role)) {
  console.error(`Unknown role "${role}". One of: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}
if (password.length < 10) {
  console.error('Choose a password of at least 10 characters.');
  process.exit(1);
}

console.log(`project : ${ref}`);
console.log(`account : ${email}`);
console.log(`role    : ${role}\n`);

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── 1. Create the login, or reuse it if the email is already registered ─────
let authId;
const created = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // no inbox round-trip needed
});

if (created.error) {
  const alreadyExists = /already|registered|exists/i.test(created.error.message);
  if (!alreadyExists) {
    console.error('Could not create the login:', created.error.message);
    process.exit(1);
  }

  // Find the existing user and reset their password so this stays idempotent.
  let page = 1;
  let found = null;
  while (!found && page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('Could not look up the existing login:', error.message);
      process.exit(1);
    }
    found = (data?.users || []).find((u) => (u.email || '').toLowerCase() === email);
    if (!data?.users?.length || data.users.length < 200) break;
    page += 1;
  }
  if (!found) {
    console.error('That email is registered but could not be found. Check the Supabase dashboard.');
    process.exit(1);
  }
  authId = found.id;

  const upd = await db.auth.admin.updateUserById(authId, {
    password,
    email_confirm: true,
  });
  if (upd.error) {
    console.error('Could not update the existing login:', upd.error.message);
    process.exit(1);
  }
  console.log('login   : already existed → password reset, email confirmed');
} else {
  authId = created.data.user.id;
  console.log('login   : created');
}

// ── 2. Link it to a staff profile ───────────────────────────────────────────
// admin_users.username is UNIQUE — clear any stale row holding this handle.
await db.from('admin_users').delete().eq('username', username).neq('id', authId);

const profile = {
  id: authId,
  username,
  // Passwords live in Supabase Auth. This column is NOT NULL in the original
  // schema, so it carries a marker rather than any credential material.
  password_hash: 'managed_by_supabase_auth',
  display_name: displayName,
  email,
  role,
  active: true,
  email_verified: true,
  approved_by: 'bootstrap',
  approved_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const { error: upsertErr } = await db.from('admin_users').upsert(profile, { onConflict: 'id' });
if (upsertErr) {
  console.error('Could not save the staff profile:', upsertErr.message);
  process.exit(1);
}
console.log('profile : linked');

// ── 3. Verify what actually landed ──────────────────────────────────────────
const { data: check, error: checkErr } = await db
  .from('admin_users')
  .select('id, username, display_name, email, role, active')
  .eq('id', authId)
  .maybeSingle();

if (checkErr || !check) {
  console.error('\nVerification failed — the profile row is not readable.');
  process.exit(1);
}

const idsMatch = check.id === authId;
console.log('\n── verification ─────────────────────────────');
console.log(`  staff row      : ${check.display_name} (@${check.username})`);
console.log(`  role / active  : ${check.role} / ${check.active}`);
console.log(`  ids linked     : ${idsMatch ? 'yes' : 'NO — sign-in will fail'}`);
console.log('─────────────────────────────────────────────');

if (!idsMatch || !check.active) process.exit(1);
console.log('\nDone. Sign in at /admin/login with this email and password.');
