/**
 * Verify that a staff member can actually sign in — the same password grant
 * the CMS login page performs — and that the resulting session resolves to a
 * staff profile. Reads credentials from the gitignored .supabase-admin.local.
 *
 *   node scripts/verify-staff-login.mjs
 *   node scripts/verify-staff-login.mjs --email a@b.com --password "…"
 *
 * Prints only pass/fail detail, never secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECRETS = path.join(HERE, '..', '.supabase-admin.local');

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const env = loadEnvFile(SECRETS);
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const email = (arg('email') || env.OCTAGON_ADMIN_EMAIL || '').trim().toLowerCase();
const password = arg('password') || env.OCTAGON_ADMIN_PASSWORD || '';

if (!key || !email || !password) {
  console.error('Need SUPABASE_SERVICE_ROLE_KEY, email and password.');
  process.exit(1);
}

const ref = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8')).ref;
const url = env.SUPABASE_URL || `https://${ref}.supabase.co`;

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

console.log(`Signing in as ${email} on ${ref}\n`);

// ── 1. Password grant (exactly what /admin/login does) ──────────────────────
const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const body = await res.json().catch(() => ({}));

check(res.ok, 'password sign-in accepted', res.ok ? '' : body.error_description || body.msg || `HTTP ${res.status}`);
if (!res.ok) {
  console.log('\nSign-in failed — the password is wrong or the login is unconfirmed.');
  process.exit(1);
}

const accessToken = body.access_token;
const authUserId = body.user?.id;
check(Boolean(accessToken), 'session token issued');
check(Boolean(body.user?.email_confirmed_at), 'email confirmed');

// ── 2. Resolve the staff profile using that session (what the app does) ─────
const profRes = await fetch(
  `${url}/rest/v1/admin_users?id=eq.${authUserId}&select=id,username,display_name,role,active`,
  { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } }
);
const rows = await profRes.json().catch(() => []);
const profile = Array.isArray(rows) ? rows[0] : null;

check(Boolean(profile), 'staff profile found for this session');
if (profile) {
  check(profile.active === true, 'account is active');
  check(profile.id === authUserId, 'auth id matches staff id');
  console.log(`\n  signed in as : ${profile.display_name} (@${profile.username})`);
  console.log(`  role         : ${profile.role}`);
}

// ── 3. Optional: check the staff-management endpoint accepts this session ───
// e.g. --api https://www.scdsoctagon.net
const apiBase = arg('api');
if (apiBase) {
  console.log(`\nChecking ${apiBase}/api/staff`);
  try {
    const r = await fetch(`${apiBase.replace(/\/$/, '')}/api/staff`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const j = await r.json().catch(() => ({}));
    check(r.ok, 'staff endpoint authorised this session', r.ok ? '' : j.error || `HTTP ${r.status}`);
    if (r.ok) {
      console.log(`  staff accounts : ${(j.staff || []).length}`);
      (j.staff || []).forEach((s) =>
        console.log(`    - ${s.display_name} <${s.email}> ${s.role}${s.active ? '' : ' (inactive)'}`)
      );
    }
  } catch (e) {
    check(false, 'staff endpoint reachable', String(e.message || e));
  }
}

console.log(
  failures === 0
    ? '\nAll checks passed — this account can sign in to the CMS.'
    : `\n${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
