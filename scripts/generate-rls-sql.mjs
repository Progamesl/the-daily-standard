/**
 * Generate supabase/02_lockdown_rls.sql against the schema this project ACTUALLY
 * has, rather than the one migrations.sql describes.
 *
 * Two earlier hand-written attempts failed in the SQL editor: one referenced a
 * table that was never created (user_sessions), and one hit a PL/pgSQL type
 * ambiguity. Both came from dynamic logic inside a DO block. So: probe the live
 * schema here, then emit flat CREATE/DROP POLICY statements with no PL/pgSQL at
 * all, for exactly the tables that exist.
 *
 *   node scripts/generate-rls-sql.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SECRETS = path.join(HERE, '..', '.supabase-admin.local');
const OUT = path.join(HERE, '..', 'supabase', '02_lockdown_rls.sql');

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
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing from .supabase-admin.local');
  process.exit(1);
}
const ref = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8')).ref;
const url = `https://${ref}.supabase.co`;

/** Policy blocks, keyed by table. Only emitted if the table exists. */
const PLAN = {
  articles: {
    note: 'Readers (and /api/sync-r2, which uses the anon key) see published stories only.',
    drop: ['Allow anon access to articles', 'Admins can manage articles', 'Public can read published articles', 'Staff manage articles'],
    create: [
      `CREATE POLICY "Public can read published articles" ON articles\n  FOR SELECT USING (status = 'published');`,
      `CREATE POLICY "Staff manage articles" ON articles\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`,
    ],
  },
  authors: {
    drop: ['Allow anon access to authors', 'Admins can manage authors', 'Public can read authors', 'Staff manage authors'],
    create: [
      `CREATE POLICY "Public can read authors" ON authors\n  FOR SELECT USING (true);`,
      `CREATE POLICY "Staff manage authors" ON authors\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`,
    ],
  },
  admin_users: {
    note: 'Reading your own row is what lets sign-in resolve a staff profile.',
    drop: ['Allow anon access to admin_users', 'Admins can manage users', 'Staff read own profile', 'Staff manage users'],
    create: [
      `CREATE POLICY "Staff read own profile" ON admin_users\n  FOR SELECT USING (id = auth.uid()::text);`,
      `CREATE POLICY "Staff manage users" ON admin_users\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`,
    ],
  },
  article_views: {
    note: 'Public pages record views; only staff can read them.',
    drop: ['Allow anon to read views', 'Admins can read views', 'Public can insert views', 'Staff read views'],
    create: [
      `CREATE POLICY "Public can insert views" ON article_views\n  FOR INSERT WITH CHECK (true);`,
      `CREATE POLICY "Staff read views" ON article_views\n  FOR SELECT USING (public.is_active_admin());`,
    ],
  },
  article_engagement: {
    drop: ['Allow anon to read engagement', 'Admins can read engagement', 'Public can insert engagement', 'Staff read engagement'],
    create: [
      `CREATE POLICY "Public can insert engagement" ON article_engagement\n  FOR INSERT WITH CHECK (true);`,
      `CREATE POLICY "Staff read engagement" ON article_engagement\n  FOR SELECT USING (public.is_active_admin());`,
    ],
  },
  comments: {
    drop: ['Admins can manage all comments', 'Staff manage comments', 'Public can read approved comments', 'Anyone can submit comments'],
    create: [
      `CREATE POLICY "Public can read approved comments" ON comments\n  FOR SELECT USING (approved = true);`,
      `CREATE POLICY "Anyone can submit comments" ON comments\n  FOR INSERT WITH CHECK (true);`,
      `CREATE POLICY "Staff manage comments" ON comments\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`,
    ],
  },
  ads: {
    drop: ['Public can read active ads', 'Staff manage ads'],
    create: [
      `CREATE POLICY "Public can read active ads" ON ads\n  FOR SELECT USING (true);`,
      `CREATE POLICY "Staff manage ads" ON ads\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`,
    ],
  },
  site_settings: {
    note: 'Had RLS enabled with no policies at all, so it was denying everyone.',
    drop: ['Staff manage settings'],
    create: [`CREATE POLICY "Staff manage settings" ON site_settings\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`],
  },
  activity_log: {
    drop: ['Staff read activity', 'Staff write activity'],
    create: [
      `CREATE POLICY "Staff read activity" ON activity_log\n  FOR SELECT USING (public.is_active_admin());`,
      `CREATE POLICY "Staff write activity" ON activity_log\n  FOR INSERT WITH CHECK (public.is_active_admin());`,
    ],
  },
  security_alerts: {
    drop: ['Staff read alerts', 'Staff manage alerts'],
    create: [`CREATE POLICY "Staff manage alerts" ON security_alerts\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`],
  },
  login_attempts: {
    note: 'Failed sign-ins are recorded while still anonymous, so INSERT stays open; reading is staff-only.',
    drop: ['Anyone can record login attempts', 'Staff read login attempts'],
    create: [
      `CREATE POLICY "Anyone can record login attempts" ON login_attempts\n  FOR INSERT WITH CHECK (true);`,
      `CREATE POLICY "Staff read login attempts" ON login_attempts\n  FOR SELECT USING (public.is_active_admin());`,
    ],
  },
  user_sessions: {
    drop: ['Users can view their own sessions', 'Admins can manage all sessions', 'Staff manage sessions'],
    create: [`CREATE POLICY "Staff manage sessions" ON user_sessions\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`],
  },
  breaking_news: {
    drop: ['Public can read active breaking news', 'Admins can manage breaking news', 'Staff manage breaking news'],
    create: [
      `CREATE POLICY "Public can read active breaking news" ON breaking_news\n  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > NOW()));`,
      `CREATE POLICY "Staff manage breaking news" ON breaking_news\n  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());`,
    ],
  },
};

// ── Probe which tables actually exist ───────────────────────────────────────
async function exists(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (res.ok) return true;
  const body = await res.json().catch(() => ({}));
  // PGRST205 = table not found in schema cache
  if (body?.code === 'PGRST205' || res.status === 404) return false;
  console.log(`  ? ${table}: unexpected ${res.status} ${body?.code || ''} — treating as absent`);
  return false;
}

console.log(`probing ${ref}…\n`);
const present = [];
const absent = [];
for (const table of Object.keys(PLAN)) {
  const ok = await exists(table);
  (ok ? present : absent).push(table);
  console.log(`  ${ok ? 'exists ' : 'absent '} ${table}`);
}

if (!present.includes('admin_users')) {
  console.error('\nadmin_users is missing — cannot build a staff-based policy set.');
  process.exit(1);
}

// ── Emit flat SQL ───────────────────────────────────────────────────────────
const lines = [];
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
lines.push('--  STEP 2 of 2 — Close the open database');
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
lines.push('--');
lines.push('--  GENERATED by scripts/generate-rls-sql.mjs against the live schema.');
lines.push('--  Plain statements only — no PL/pgSQL, no DO blocks, no dynamic SQL. Every');
lines.push('--  table referenced below was confirmed to exist on this project first.');
lines.push('--');
lines.push('--  WHAT THIS FIXES');
lines.push('--  fix_rls_policies.sql granted the anonymous role FOR ALL USING (true) on');
lines.push('--  articles, authors AND admin_users. The anon key ships inside the public');
lines.push('--  JavaScript bundle, so anyone could read, edit or delete every article and');
lines.push('--  read the staff table. These policies require a signed-in, active staff');
lines.push('--  member instead.');
lines.push('--');
lines.push('--  Run 01_bootstrap_admin.sql first and confirm you can sign in.');
lines.push('--  03_rollback_rls.sql reverses this.');
lines.push('--');
lines.push(`--  Tables covered : ${present.join(', ')}`);
lines.push(`--  Not on this DB : ${absent.length ? absent.join(', ') : 'none'}`);
lines.push('-- ═══════════════════════════════════════════════════════════════════════════');
lines.push('');
lines.push('-- Is the caller a signed-in, active staff member?');
lines.push('-- SECURITY DEFINER is REQUIRED: this is used by the policies on admin_users');
lines.push('-- itself, and without it the policy would re-enter admin_users and Postgres');
lines.push('-- would raise infinite recursion.');
lines.push('CREATE OR REPLACE FUNCTION public.is_active_admin()');
lines.push('RETURNS boolean');
lines.push('LANGUAGE sql');
lines.push('STABLE');
lines.push('SECURITY DEFINER');
lines.push('SET search_path = public');
lines.push('AS $$');
lines.push('  SELECT EXISTS (');
lines.push('    SELECT 1 FROM admin_users');
lines.push("    WHERE id = auth.uid()::text AND active");
lines.push('  );');
lines.push('$$;');
lines.push('');
lines.push('REVOKE ALL ON FUNCTION public.is_active_admin() FROM public;');
lines.push('GRANT EXECUTE ON FUNCTION public.is_active_admin() TO anon, authenticated;');
lines.push('');

for (const table of present) {
  const p = PLAN[table];
  lines.push(`-- ── ${table} ${'─'.repeat(Math.max(2, 66 - table.length))}`);
  if (p.note) lines.push(`-- ${p.note}`);
  lines.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  for (const name of p.drop) lines.push(`DROP POLICY IF EXISTS "${name}" ON ${table};`);
  for (const stmt of p.create) lines.push(stmt);
  lines.push('');
}

lines.push('-- ── Verify ─────────────────────────────────────────────────────────────────');
lines.push('-- No row below should show a bare `true` for an ALL/UPDATE/DELETE command.');
lines.push('SELECT tablename, policyname, cmd, qual::text AS using_expr');
lines.push('FROM pg_policies');
lines.push("WHERE schemaname = 'public'");
lines.push("  AND tablename IN ('articles', 'authors', 'admin_users')");
lines.push('ORDER BY tablename, policyname;');
lines.push('');

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`\npresent : ${present.length} tables`);
console.log(`absent  : ${absent.length ? absent.join(', ') : 'none'}`);
console.log(`\nWrote supabase/02_lockdown_rls.sql (${lines.length} lines, no PL/pgSQL)`);
