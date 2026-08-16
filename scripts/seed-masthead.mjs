/**
 * Put the 2026-27 masthead into the database.
 *
 * Reads src/data/staffData.ts — the committed list, which stays as the fallback
 * the staff page uses when the database cannot be reached — and writes each
 * person into `authors` with their masthead fields set.
 *
 * Matches on name, so a returning staffer updates the author record that
 * already carries their bylines rather than becoming a second copy of the same
 * person. Anybody previously on the masthead who is not on this list is taken
 * off it; their author record, and every story they wrote, is untouched.
 *
 * Run once after supabase/06_staff_masthead.sql:
 *   node scripts/seed-masthead.mjs            (shows what it would do)
 *   node scripts/seed-masthead.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

// ── Credentials ─────────────────────────────────────────────────────────────
const envFile = path.join(ROOT, '.supabase-admin.local');
if (!fs.existsSync(envFile)) {
  console.error('Missing .supabase-admin.local (needs SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}
const KEY = fs.readFileSync(envFile, 'utf8').split(/\r?\n/).map(l => l.trim())
  .find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))?.slice('SUPABASE_SERVICE_ROLE_KEY='.length);
if (!KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY not found.'); process.exit(1); }
const REF = JSON.parse(Buffer.from(KEY.split('.')[1], 'base64').toString('utf8')).ref;
const REST = `https://${REF}.supabase.co/rest/v1/authors`;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// ── The committed masthead ──────────────────────────────────────────────────
const src = fs.readFileSync(path.join(ROOT, 'src/data/staffData.ts'), 'utf8');
const people = [];
const re = /\{\s*name:\s*"([^"]+)"([\s\S]*?)\n  \}/g;
let m;
while ((m = re.exec(src))) {
  const b = m[2];
  const one = (k) => (b.match(new RegExp(`${k}:\\s*"((?:[^"\\\\]|\\\\.)*)"`)) || [])[1];
  const list = (k) => {
    const raw = (b.match(new RegExp(`${k}:\\s*\\[([^\\]]*)\\]`)) || [])[1];
    return raw ? raw.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean) : [];
  };
  people.push({
    name: m[1],
    role: one('role') || 'Reporter',
    bio: (one('bio') || '').replace(/\\"/g, '"'),
    image: /photo:\s*"http/.test(b) ? one('photo') : '',
    email: one('email') || null,
    primarySection: one('primarySection') || 'Reporters',
    altSections: list('altSections'),
    tags: list('tags'),
  });
}
if (people.length === 0) { console.error('Could not parse staffData.ts'); process.exit(1); }

// Order within a section follows the file, which is the order of the masthead.
const seen = new Map();
for (const p of people) {
  const n = (seen.get(p.primarySection) ?? 0);
  p.sortOrder = n;
  seen.set(p.primarySection, n + 1);
}

console.log(`masthead in the file: ${people.length} people\n`);

// ── What is already there ───────────────────────────────────────────────────
//
// Read the masthead column if it exists, and fall back to the plain columns if
// it does not — so a dry run still tells you what would happen before the
// migration has been applied.
let existing = await (await fetch(`${REST}?select=id,name,on_masthead&limit=2000`, { headers: H })).json();
let migrated = Array.isArray(existing);
if (!migrated) {
  existing = await (await fetch(`${REST}?select=id,name&limit=2000`, { headers: H })).json();
  if (!Array.isArray(existing)) {
    console.error('Could not read the authors table:', existing);
    process.exit(1);
  }
  console.log('NOTE: supabase/06_staff_masthead.sql has not been run yet.');
  console.log('      This is a preview only — writing will fail until it has.\n');
}
const byName = new Map(existing.map(a => [String(a.name).trim().toLowerCase(), a]));

const slug = n => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const updates = [], inserts = [];
for (const p of people) {
  const match = byName.get(p.name.trim().toLowerCase());
  const row = {
    name: p.name,
    role: p.role,
    bio: p.bio || null,
    image: p.image || null,
    email: p.email,
    on_masthead: true,
    primary_section: p.primarySection,
    alt_sections: p.altSections,
    tags: p.tags,
    sort_order: p.sortOrder,
    updated_at: new Date().toISOString(),
  };
  if (match) updates.push({ ...row, id: match.id });
  else inserts.push({ ...row, id: slug(p.name) });
}

const keep = new Set(people.map(p => p.name.trim().toLowerCase()));
const demote = existing.filter(a => a.on_masthead === true && !keep.has(String(a.name).trim().toLowerCase()));

console.log(`update in place (already an author): ${updates.length}`);
console.log(`add as a new author:                 ${inserts.length}`);
for (const i of inserts) console.log(`    + ${i.name}`);
console.log(`take off the masthead:               ${demote.length}`);
for (const d of demote) console.log(`    - ${d.name}`);

if (!APPLY) {
  console.log('\n(nothing written — pass --apply)');
  process.exit(0);
}

if (!migrated) {
  console.error('\nRun supabase/06_staff_masthead.sql first — the masthead columns do not exist yet.');
  process.exit(1);
}

// ── Write ───────────────────────────────────────────────────────────────────
const send = async (body) => {
  const r = await fetch(REST, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
};

try {
  if (updates.length) await send(updates);
  if (inserts.length) await send(inserts);
  for (const d of demote) {
    const r = await fetch(`${REST}?id=eq.${encodeURIComponent(d.id)}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ on_masthead: false }),
    });
    if (!r.ok) console.warn(`  could not take ${d.name} off: ${r.status}`);
  }
} catch (err) {
  console.error('\nFailed:', err.message);
  console.error('If it mentions a missing column, run supabase/06_staff_masthead.sql first.');
  process.exit(1);
}

const after = await (await fetch(`${REST}?select=name,primary_section,sort_order&on_masthead=eq.true&limit=200`, { headers: H })).json();
console.log(`\ndone — ${after.length} people on the masthead`);
const bySection = {};
for (const a of after) (bySection[a.primary_section] ??= []).push(a);
for (const [s, list] of Object.entries(bySection)) {
  console.log(`   ${s} (${list.length})`);
}
