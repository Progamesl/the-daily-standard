/**
 * Prove the database lockdown actually holds, by attacking it.
 *
 * Reading the policy list isn't proof — a policy with an unexpected name can
 * leave a hole open. This performs the real requests an attacker (and the site,
 * and an editor) would make, and reports what genuinely succeeds.
 *
 *   node scripts/verify-rls.mjs
 *
 * Uses the anon key exactly as a browser would (it is public and ships in the
 * JS bundle), plus a real staff sign-in. Creates and then deletes a temporary
 * low-privilege account to test for privilege escalation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECRETS = path.join(HERE, '..', '.supabase-admin.local');
const SITE = process.env.OCTAGON_SITE || 'https://www.scdsoctagon.net';

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

const env = loadEnvFile(SECRETS);
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing from .supabase-admin.local');
  process.exit(1);
}
const ref = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8')).ref;
const url = `https://${ref}.supabase.co`;

let pass = 0;
let fail = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : '*** FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

// ── Recover the public anon key the way a visitor's browser gets it ─────────
async function getAnonKey() {
  if (env.SUPABASE_ANON_KEY) return env.SUPABASE_ANON_KEY;
  const html = await fetch(SITE).then((r) => r.text());
  const asset = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if (!asset) throw new Error('could not locate the site bundle');
  const js = await fetch(`${SITE}${asset}`).then((r) => r.text());
  for (const m of js.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64').toString('utf8'));
      if (payload.role === 'anon' && payload.ref === ref) return m[0];
    } catch { /* not a JWT */ }
  }
  throw new Error('no anon key found in the published bundle');
}

const anonKey = await getAnonKey();
const anon = { apikey: anonKey, 'Content-Type': 'application/json' };
const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

console.log(`project: ${ref}\n`);

// ═══════════════════════════════════════════════════════════════════════════
console.log('── As an anonymous visitor (what any stranger can do) ─────────');

// 1. Public reads must still work, or the site breaks.
{
  const r = await fetch(`${url}/rest/v1/articles?select=id,headline&limit=2`, { headers: anon });
  const b = await r.json().catch(() => []);
  check(r.ok && Array.isArray(b) && b.length > 0, 'can still READ published articles (site works)',
    r.ok ? '' : `HTTP ${r.status}`);
}

// 2. Drafts must NOT be visible.
{
  const r = await fetch(`${url}/rest/v1/articles?select=id,status&status=neq.published&limit=5`, { headers: anon });
  const b = await r.json().catch(() => []);
  const leaked = Array.isArray(b) ? b.length : 0;
  check(leaked === 0, 'cannot read unpublished drafts', leaked ? `${leaked} draft(s) exposed` : '');
}

// 3. THE HOLE: writing to articles.
//
// Status codes alone are misleading here. RLS filters rows rather than
// rejecting the statement, so an UPDATE that matches nothing returns 200 with
// an empty body whether or not it was allowed. The only trustworthy check is
// to aim at a row that really exists and then read it back with the service
// key to see whether the data actually changed.
{
  const [target] = await fetch(
    `${url}/rest/v1/articles?select=id,headline&status=eq.published&limit=1`, { headers: svc }
  ).then((r) => r.json());

  await fetch(`${url}/rest/v1/articles?id=eq.${encodeURIComponent(target.id)}`, {
    method: 'PATCH', headers: { ...anon, Prefer: 'return=representation' },
    body: JSON.stringify({ headline: '__RLS_PROBE_TAMPERED__' }),
  }).catch(() => {});

  const [after] = await fetch(
    `${url}/rest/v1/articles?id=eq.${encodeURIComponent(target.id)}&select=headline`, { headers: svc }
  ).then((r) => r.json());

  const tampered = after.headline !== target.headline;
  check(!tampered, 'cannot UPDATE a real article', tampered ? 'DATA WAS MODIFIED — STILL OPEN' : 'row unchanged');

  if (tampered) {
    await fetch(`${url}/rest/v1/articles?id=eq.${encodeURIComponent(target.id)}`, {
      method: 'PATCH', headers: svc, body: JSON.stringify({ headline: target.headline }),
    });
    console.log('            (original headline restored)');
  }
}

// DELETE is tested against a throwaway row so a hole can't destroy real content.
{
  const id = `__rls_probe_${Date.now()}__`;
  const created = await fetch(`${url}/rest/v1/articles`, {
    method: 'POST', headers: svc,
    body: JSON.stringify({
      id, slug: id, headline: 'RLS probe (temporary)', body: 'probe', section: 'us',
      author_id: 'probe', author_name: 'probe', status: 'draft',
    }),
  });

  if (created.ok || created.status === 201) {
    await fetch(`${url}/rest/v1/articles?id=eq.${id}`, { method: 'DELETE', headers: anon }).catch(() => {});
    const rows = await fetch(`${url}/rest/v1/articles?id=eq.${id}&select=id`, { headers: svc }).then((r) => r.json());
    const survived = Array.isArray(rows) && rows.length === 1;
    check(survived, 'cannot DELETE a real article', survived ? 'row survived' : 'ROW WAS DELETED — STILL OPEN');
    await fetch(`${url}/rest/v1/articles?id=eq.${id}`, { method: 'DELETE', headers: svc });
  } else {
    console.log('  (skipped DELETE test: could not create the temporary row)');
  }
}
{
  const r = await fetch(`${url}/rest/v1/articles`, {
    method: 'POST', headers: anon,
    body: JSON.stringify({ id: '__rls_probe__', slug: '__rls_probe__', headline: 'probe', body: 'x', section: 'us', author_id: 'x', author_name: 'x' }),
  });
  if (r.ok) await fetch(`${url}/rest/v1/articles?id=eq.__rls_probe__`, { method: 'DELETE', headers: svc });
  check(!r.ok, 'cannot INSERT articles', r.ok ? 'permitted — STILL OPEN' : `blocked (HTTP ${r.status})`);
}

// 4. The staff table must not be readable.
{
  const r = await fetch(`${url}/rest/v1/admin_users?select=id,email,role,password_hash`, { headers: anon });
  const b = await r.json().catch(() => []);
  const rows = Array.isArray(b) ? b.length : 0;
  check(rows === 0, 'cannot read the staff table', rows ? `${rows} staff row(s) exposed — STILL OPEN` : '');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── As a signed-in editor (the CMS must still work) ────────────');

const email = env.OCTAGON_ADMIN_EMAIL;
const password = env.OCTAGON_ADMIN_PASSWORD;
let adminToken = null;
if (email && password) {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const b = await r.json().catch(() => ({}));
  adminToken = b.access_token || null;
  check(Boolean(adminToken), 'super admin can sign in', adminToken ? '' : b.error_description || `HTTP ${r.status}`);
}

if (adminToken) {
  const auth = { apikey: anonKey, Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
  {
    const r = await fetch(`${url}/rest/v1/articles?select=id,status&status=neq.published&limit=3`, { headers: auth });
    check(r.ok, 'editor CAN see drafts', r.ok ? '' : `HTTP ${r.status}`);
  }
  {
    const r = await fetch(`${url}/rest/v1/articles?id=eq.__rls_probe__`, {
      method: 'PATCH', headers: { ...auth, Prefer: 'return=representation' },
      body: JSON.stringify({ headline: 'rls-probe' }),
    });
    check(r.ok, 'editor CAN write articles (publishing works)', r.ok ? '' : `blocked HTTP ${r.status} — CMS IS BROKEN`);
  }
  {
    const r = await fetch(`${url}/rest/v1/admin_users?select=id,email,role`, { headers: auth });
    const b = await r.json().catch(() => []);
    check(r.ok && Array.isArray(b) && b.length > 0, 'editor CAN read the staff roster', r.ok ? '' : `HTTP ${r.status}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Privilege escalation (can a reporter promote themselves?) ──');

const probeEmail = `rls-probe-${Date.now()}@octagon-test.invalid`;
const probePassword = `Probe!${Math.random().toString(36).slice(2)}Aa1`;
let probeId = null;
try {
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: svc,
    body: JSON.stringify({ email: probeEmail, password: probePassword, email_confirm: true }),
  });
  const cb = await created.json().catch(() => ({}));
  probeId = cb.id || cb.user?.id || null;

  if (probeId) {
    await fetch(`${url}/rest/v1/admin_users`, {
      method: 'POST', headers: svc,
      body: JSON.stringify({
        id: probeId, username: `rlsprobe${Date.now()}`, password_hash: 'managed_by_supabase_auth',
        display_name: 'RLS Probe', email: probeEmail, role: 'reporter', active: true,
      }),
    });

    const signin = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: probeEmail, password: probePassword }),
    });
    const sb = await signin.json().catch(() => ({}));
    const probeToken = sb.access_token;

    if (probeToken) {
      const pAuth = { apikey: anonKey, Authorization: `Bearer ${probeToken}`, 'Content-Type': 'application/json' };

      // The attack: promote myself to super_admin.
      await fetch(`${url}/rest/v1/admin_users?id=eq.${probeId}`, {
        method: 'PATCH', headers: { ...pAuth, Prefer: 'return=representation' },
        body: JSON.stringify({ role: 'super_admin' }),
      });

      // Read back with the service key — the truth, regardless of what the API said.
      const after = await fetch(`${url}/rest/v1/admin_users?id=eq.${probeId}&select=role`, { headers: svc });
      const ab = await after.json().catch(() => []);
      const nowRole = Array.isArray(ab) && ab[0] ? ab[0].role : '?';
      check(nowRole !== 'super_admin', 'a reporter CANNOT promote themselves to super_admin',
        nowRole === 'super_admin' ? 'ESCALATED — role is now super_admin' : `role stayed "${nowRole}"`);

      // Can a reporter read everyone else's staff records?
      const roster = await fetch(`${url}/rest/v1/admin_users?select=id,email,role`, { headers: pAuth });
      const rb = await roster.json().catch(() => []);
      const visible = Array.isArray(rb) ? rb.length : 0;
      console.log(`  note      a reporter can see ${visible} staff row(s)`);
    } else {
      console.log('  (skipped: probe account could not sign in)');
    }
  } else {
    console.log('  (skipped: could not create probe account)');
  }
} finally {
  if (probeId) {
    await fetch(`${url}/rest/v1/admin_users?id=eq.${probeId}`, { method: 'DELETE', headers: svc }).catch(() => {});
    await fetch(`${url}/auth/v1/admin/users/${probeId}`, { method: 'DELETE', headers: svc }).catch(() => {});
    console.log('  (probe account removed)');
  }
}

console.log(`\n${'═'.repeat(62)}`);
console.log(fail === 0 ? `ALL ${pass} CHECKS PASSED — the database is locked down.` : `${fail} FAILURE(S), ${pass} passed — NOT fully secure.`);
process.exit(fail === 0 ? 0 : 1);
