/**
 * End-to-end proof that a non-technical staff member can actually run the site.
 *
 * Walks the real workflow, using the real endpoints, with no shortcuts:
 *
 *   1. An editor-in-chief creates a staff account through /api/staff
 *      (exactly what the Staff screen does).
 *   2. That new person signs in with their own email and password.
 *   3. They write and publish a story, writing to Supabase under THEIR session
 *      — so this also proves the row-level policies allow ordinary staff to
 *      publish, not just the owner.
 *   4. The publish is synced to R2, which is what the public site reads.
 *   5. A completely separate anonymous visitor — a different browser, no
 *      session, no cache — is checked for the story.
 *   6. Everything created is removed again.
 *
 *   node scripts/verify-newsroom-workflow.mjs
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
const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

let pass = 0;
let fail = 0;
const step = (n, label) => console.log(`\n${n}. ${label}`);
const check = (ok, label, detail = '') => {
  console.log(`   ${ok ? 'PASS' : '*** FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  ok ? pass++ : fail++;
  return ok;
};

async function anonKeyFromLiveSite() {
  const html = await fetch(SITE).then((r) => r.text());
  const asset = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  const js = await fetch(`${SITE}${asset}`).then((r) => r.text());
  for (const m of js.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const p = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64').toString('utf8'));
      if (p.role === 'anon' && p.ref === ref) return m[0];
    } catch { /* not a JWT */ }
  }
  throw new Error('could not recover the public key from the live site');
}

const anonKey = await anonKeyFromLiveSite();
const stamp = Date.now();
const staffEmail = `workflow-probe-${stamp}@octagon-test.invalid`;
const staffPassword = `Probe!${Math.random().toString(36).slice(2)}Aa1`;
const slug = `workflow-probe-${stamp}`;
const articleId = `workflow_probe_${stamp}`;

let ownerToken = null;
let staffId = null;
let staffToken = null;

console.log(`site    : ${SITE}`);
console.log(`project : ${ref}`);

try {
  // ── 1. Owner signs in, then creates a staff account through the real API ──
  step(1, 'An editor creates a staff account (what the Staff screen does)');
  {
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.OCTAGON_ADMIN_EMAIL, password: env.OCTAGON_ADMIN_PASSWORD }),
    });
    ownerToken = (await r.json().catch(() => ({}))).access_token || null;
    if (!check(Boolean(ownerToken), 'owner can sign in')) throw new Error('owner sign-in failed');
  }
  {
    const r = await fetch(`${SITE}/api/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        email: staffEmail,
        password: staffPassword,
        displayName: 'Workflow Probe',
        role: 'section_editor',
        section: 'us',
      }),
    });
    const b = await r.json().catch(() => ({}));
    staffId = b.id || null;
    check(r.ok && Boolean(staffId), 'staff account created via /api/staff', r.ok ? '' : b.error || `HTTP ${r.status}`);
  }

  // ── 2. The new person signs in themselves ────────────────────────────────
  step(2, 'The new staff member signs in with their own credentials');
  {
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: staffEmail, password: staffPassword }),
    });
    const b = await r.json().catch(() => ({}));
    staffToken = b.access_token || null;
    if (!check(Boolean(staffToken), 'new staff member can sign in', staffToken ? '' : b.error_description || `HTTP ${r.status}`)) {
      throw new Error('staff sign-in failed');
    }
  }

  // ── 3. They publish a story under their own session ──────────────────────
  step(3, 'They write and publish a story (as themselves, not as the owner)');
  const staffAuth = { apikey: anonKey, Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' };
  {
    const r = await fetch(`${url}/rest/v1/articles`, {
      method: 'POST', headers: { ...staffAuth, Prefer: 'return=representation' },
      body: JSON.stringify({
        id: articleId,
        slug,
        headline: 'Workflow probe — safe to ignore',
        dek: 'Automated end-to-end check.',
        body: '<p>Automated end-to-end check. This story is deleted immediately.</p>',
        section: 'us',
        author_id: 'workflow-probe',
        author_name: 'Workflow Probe',
        status: 'published',
        published_at: new Date().toISOString(),
      }),
    });
    const b = await r.text();
    check(r.ok, 'ordinary staff CAN publish (row-level policies allow it)', r.ok ? '' : `HTTP ${r.status} ${b.slice(0, 140)}`);
  }

  // ── 4. Publishing syncs to the store the public site reads ───────────────
  step(4, 'The publish is pushed to the public data store (R2)');
  {
    const r = await fetch(`${SITE}/api/sync-r2`, { method: 'POST' });
    const b = await r.json().catch(() => ({}));
    check(r.ok && b.ok === true, 'sync-r2 succeeded', r.ok ? `${b.total} articles` : `HTTP ${r.status}`);
  }

  // ── 5. A stranger's browser sees it ──────────────────────────────────────
  step(5, 'A separate anonymous visitor (no session, no cache) sees the story');
  const r2Base = 'https://pub-cc09e9eb3d7d4e83b7fb733e08d877bb.r2.dev';
  {
    const r = await fetch(`${r2Base}/articles/articles.json?t=${Date.now()}`, { cache: 'no-store' });
    const list = await r.json().catch(() => []);
    const found = Array.isArray(list) && list.some((a) => a.slug === slug);
    check(found, 'story appears in the public article list');
  }
  {
    const r = await fetch(`${r2Base}/articles/content/${slug}.json?t=${Date.now()}`, { cache: 'no-store' });
    const a = await r.json().catch(() => null);
    check(r.ok && a && a.slug === slug, 'the full story is readable at its own URL', r.ok ? '' : `HTTP ${r.status}`);
  }
  {
    // Anonymous Supabase read — the fallback path the site uses if R2 is cold.
    const r = await fetch(`${url}/rest/v1/articles?slug=eq.${slug}&select=slug,status`, {
      headers: { apikey: anonKey },
    });
    const rows = await r.json().catch(() => []);
    check(Array.isArray(rows) && rows.length === 1, 'visible to anonymous readers via the database fallback too');
  }
} catch (err) {
  console.log(`\n   (stopped early: ${err.message})`);
} finally {
  // ── 6. Clean up ──────────────────────────────────────────────────────────
  step(6, 'Cleaning up everything this test created');
  await fetch(`${url}/rest/v1/articles?id=eq.${articleId}`, { method: 'DELETE', headers: svc }).catch(() => {});
  if (staffId) {
    await fetch(`${url}/rest/v1/admin_users?id=eq.${staffId}`, { method: 'DELETE', headers: svc }).catch(() => {});
    await fetch(`${url}/auth/v1/admin/users/${staffId}`, { method: 'DELETE', headers: svc }).catch(() => {});
  }
  const gone = await fetch(`${url}/rest/v1/articles?id=eq.${articleId}&select=id`, { headers: svc })
    .then((r) => r.json()).catch(() => []);
  check(Array.isArray(gone) && gone.length === 0, 'test story removed');
  // Re-sync so the probe story leaves the public site as well.
  await fetch(`${SITE}/api/sync-r2`, { method: 'POST' }).catch(() => {});
  console.log('   public data re-synced');
}

console.log(`\n${'═'.repeat(64)}`);
console.log(fail === 0
  ? `ALL ${pass} CHECKS PASSED — staff can be onboarded, publish, and reach readers.`
  : `${fail} FAILURE(S), ${pass} passed.`);
process.exit(fail === 0 ? 0 : 1);
