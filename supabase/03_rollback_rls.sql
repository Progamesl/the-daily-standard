-- ═══════════════════════════════════════════════════════════════════════════
--  EMERGENCY ROLLBACK for 02_lockdown_rls.sql
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Use this ONLY if the lockdown left you unable to publish and you need the
--  newsroom working again immediately (e.g. mid-deadline).
--
--  ⚠ This reopens the database: it restores the permissive policies, which
--    means anyone holding the public anon key can read and write your articles
--    again. Treat it as a temporary measure and re-apply 02_lockdown_rls.sql
--    as soon as the sign-in problem is sorted out.
--
--  Before reaching for this, check the usual causes first:
--    1. Are you actually signed in at /admin/login? (Not just viewing /admin.)
--    2. Does your admin_users row exist and have active = true?
--         SELECT id, email, role, active FROM admin_users;
--    3. Does its id match your auth user id?
--         SELECT id, email FROM auth.users;
--       The two ids must be identical (admin_users.id is TEXT).
--    4. Does the helper return true while signed in?
--         SELECT public.is_active_admin();
--       If that returns false, 01_bootstrap_admin.sql did not link correctly —
--       re-run it rather than rolling back.
-- ═══════════════════════════════════════════════════════════════════════════

-- Guarded the same way as the lockdown: this project doesn't have every table
-- that migrations.sql describes, and an unguarded reference aborts the run.
DO $rollback$
BEGIN
  IF to_regclass('public.articles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage articles" ON articles';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read published articles" ON articles';
    EXECUTE 'CREATE POLICY "Allow anon access to articles" ON articles FOR ALL USING (true)';
  END IF;

  IF to_regclass('public.authors') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage authors" ON authors';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read authors" ON authors';
    EXECUTE 'CREATE POLICY "Allow anon access to authors" ON authors FOR ALL USING (true)';
  END IF;

  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage users" ON admin_users';
    EXECUTE 'DROP POLICY IF EXISTS "Staff read own profile" ON admin_users';
    EXECUTE 'CREATE POLICY "Allow anon access to admin_users" ON admin_users FOR ALL USING (true)';
  END IF;

  IF to_regclass('public.article_views') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff read views" ON article_views';
    EXECUTE 'CREATE POLICY "Allow anon to read views" ON article_views FOR SELECT USING (true)';
  END IF;

  IF to_regclass('public.article_engagement') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff read engagement" ON article_engagement';
    EXECUTE 'CREATE POLICY "Allow anon to read engagement" ON article_engagement FOR SELECT USING (true)';
  END IF;

  RAISE NOTICE 'Rolled back to open policies — the database is publicly writable again.';
END
$rollback$;
