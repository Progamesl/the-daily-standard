-- ═══════════════════════════════════════════════════════════════════════════
--  STEP 2 of 2 — Close the open database
-- ═══════════════════════════════════════════════════════════════════════════
--
--  WHAT THIS FIXES
--  fix_rls_policies.sql granted the anonymous role `FOR ALL USING (true)` on
--  articles, authors AND admin_users. Because the anon key ships inside the
--  public JavaScript bundle, anyone on the internet could read, edit or delete
--  every article and read the staff table. This replaces those policies with
--  ones that require a signed-in, active staff member.
--
--  ⚠ RUN 01_bootstrap_admin.sql FIRST, and confirm you can actually sign in at
--    /admin/login. If you run this with no working staff login, the CMS will
--    refuse all writes until you fix it. 03_rollback_rls.sql reverses this.
--
--  Every statement is guarded by an existence check, because the live database
--  does not contain every table in migrations.sql (user_sessions, for one, was
--  never created). Tables that don't exist are skipped and reported at the end
--  rather than aborting the run.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Helper: is the caller a signed-in, active staff member? ─────────────────
-- SECURITY DEFINER is REQUIRED. This function is used inside the policies on
-- admin_users itself; without DEFINER (which bypasses RLS for the lookup) the
-- policy would re-enter admin_users and Postgres would raise infinite recursion.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE id = auth.uid()::text
      AND active
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO anon, authenticated;

DO $lockdown$
DECLARE
  secured text[] := '{}';
  skipped text[] := '{}';
BEGIN
  -- ── articles ──────────────────────────────────────────────────────────────
  IF to_regclass('public.articles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE articles ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon access to articles" ON articles';      -- the hole
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage articles" ON articles';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read published articles" ON articles';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage articles" ON articles';
    -- Readers (and /api/sync-r2, which uses the anon key) see published only.
    EXECUTE 'CREATE POLICY "Public can read published articles" ON articles
               FOR SELECT USING (status = ''published'')';
    -- Staff get full control, including drafts.
    EXECUTE 'CREATE POLICY "Staff manage articles" ON articles
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'articles';
  ELSE
    skipped := skipped || 'articles';
  END IF;

  -- ── authors ───────────────────────────────────────────────────────────────
  IF to_regclass('public.authors') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE authors ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon access to authors" ON authors';        -- the hole
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage authors" ON authors';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read authors" ON authors';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage authors" ON authors';
    EXECUTE 'CREATE POLICY "Public can read authors" ON authors
               FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Staff manage authors" ON authors
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'authors';
  ELSE
    skipped := skipped || 'authors';
  END IF;

  -- ── admin_users (the staff table — was world-readable) ────────────────────
  IF to_regclass('public.admin_users') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon access to admin_users" ON admin_users'; -- the hole
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage users" ON admin_users';
    EXECUTE 'DROP POLICY IF EXISTS "Staff read own profile" ON admin_users';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage users" ON admin_users';
    -- Reading your own row is what lets sign-in resolve a profile.
    EXECUTE 'CREATE POLICY "Staff read own profile" ON admin_users
               FOR SELECT USING (id = auth.uid()::text)';
    EXECUTE 'CREATE POLICY "Staff manage users" ON admin_users
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'admin_users';
  ELSE
    skipped := skipped || 'admin_users';
  END IF;

  -- ── article_views: public may write, staff may read ───────────────────────
  IF to_regclass('public.article_views') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE article_views ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon to read views" ON article_views';       -- the hole
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read views" ON article_views';
    EXECUTE 'DROP POLICY IF EXISTS "Public can insert views" ON article_views';
    EXECUTE 'DROP POLICY IF EXISTS "Staff read views" ON article_views';
    EXECUTE 'CREATE POLICY "Public can insert views" ON article_views
               FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Staff read views" ON article_views
               FOR SELECT USING (public.is_active_admin())';
    secured := secured || 'article_views';
  ELSE
    skipped := skipped || 'article_views';
  END IF;

  -- ── article_engagement ────────────────────────────────────────────────────
  IF to_regclass('public.article_engagement') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE article_engagement ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon to read engagement" ON article_engagement'; -- the hole
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read engagement" ON article_engagement';
    EXECUTE 'DROP POLICY IF EXISTS "Public can insert engagement" ON article_engagement';
    EXECUTE 'DROP POLICY IF EXISTS "Staff read engagement" ON article_engagement';
    EXECUTE 'CREATE POLICY "Public can insert engagement" ON article_engagement
               FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Staff read engagement" ON article_engagement
               FOR SELECT USING (public.is_active_admin())';
    secured := secured || 'article_engagement';
  ELSE
    skipped := skipped || 'article_engagement';
  END IF;

  -- ── comments ──────────────────────────────────────────────────────────────
  IF to_regclass('public.comments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE comments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all comments" ON comments';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage comments" ON comments';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read approved comments" ON comments';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can submit comments" ON comments';
    EXECUTE 'CREATE POLICY "Public can read approved comments" ON comments
               FOR SELECT USING (approved = true)';
    EXECUTE 'CREATE POLICY "Anyone can submit comments" ON comments
               FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Staff manage comments" ON comments
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'comments';
  ELSE
    skipped := skipped || 'comments';
  END IF;

  -- ── ads (not in migrations.sql, but the app reads it) ──────────────────────
  IF to_regclass('public.ads') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE ads ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read active ads" ON ads';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage ads" ON ads';
    EXECUTE 'CREATE POLICY "Public can read active ads" ON ads
               FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Staff manage ads" ON ads
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'ads';
  ELSE
    skipped := skipped || 'ads';
  END IF;

  -- ── site_settings: had RLS on with NO policies (deny-all for everyone) ────
  IF to_regclass('public.site_settings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage settings" ON site_settings';
    EXECUTE 'CREATE POLICY "Staff manage settings" ON site_settings
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'site_settings';
  ELSE
    skipped := skipped || 'site_settings';
  END IF;

  -- ── activity_log ──────────────────────────────────────────────────────────
  IF to_regclass('public.activity_log') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Staff read activity" ON activity_log';
    EXECUTE 'DROP POLICY IF EXISTS "Staff write activity" ON activity_log';
    EXECUTE 'CREATE POLICY "Staff read activity" ON activity_log
               FOR SELECT USING (public.is_active_admin())';
    EXECUTE 'CREATE POLICY "Staff write activity" ON activity_log
               FOR INSERT WITH CHECK (public.is_active_admin())';
    secured := secured || 'activity_log';
  ELSE
    skipped := skipped || 'activity_log';
  END IF;

  -- ── security_alerts ───────────────────────────────────────────────────────
  IF to_regclass('public.security_alerts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Staff read alerts" ON security_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage alerts" ON security_alerts';
    EXECUTE 'CREATE POLICY "Staff manage alerts" ON security_alerts
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'security_alerts';
  ELSE
    skipped := skipped || 'security_alerts';
  END IF;

  -- ── login_attempts ────────────────────────────────────────────────────────
  -- The app records FAILED sign-ins, which happen while still anonymous, so
  -- INSERT must stay open. Reading — the sensitive part — is staff-only.
  IF to_regclass('public.login_attempts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can record login attempts" ON login_attempts';
    EXECUTE 'DROP POLICY IF EXISTS "Staff read login attempts" ON login_attempts';
    EXECUTE 'CREATE POLICY "Anyone can record login attempts" ON login_attempts
               FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Staff read login attempts" ON login_attempts
               FOR SELECT USING (public.is_active_admin())';
    secured := secured || 'login_attempts';
  ELSE
    skipped := skipped || 'login_attempts';
  END IF;

  -- ── user_sessions (absent on this project — guarded) ──────────────────────
  IF to_regclass('public.user_sessions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all sessions" ON user_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage sessions" ON user_sessions';
    EXECUTE 'CREATE POLICY "Staff manage sessions" ON user_sessions
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'user_sessions';
  ELSE
    skipped := skipped || 'user_sessions';
  END IF;

  -- ── breaking_news ─────────────────────────────────────────────────────────
  IF to_regclass('public.breaking_news') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE breaking_news ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public can read active breaking news" ON breaking_news';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage breaking news" ON breaking_news';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage breaking news" ON breaking_news';
    EXECUTE 'CREATE POLICY "Public can read active breaking news" ON breaking_news
               FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > NOW()))';
    EXECUTE 'CREATE POLICY "Staff manage breaking news" ON breaking_news
               FOR ALL USING (public.is_active_admin())
               WITH CHECK (public.is_active_admin())';
    secured := secured || 'breaking_news';
  ELSE
    skipped := skipped || 'breaking_news';
  END IF;

  RAISE NOTICE 'Secured: %', array_to_string(secured, ', ');
  RAISE NOTICE 'Skipped (table not present): %', COALESCE(NULLIF(array_to_string(skipped, ', '), ''), 'none');
END
$lockdown$;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Nothing below should show a policy that is simply `true` for ALL/UPDATE/DELETE
-- on articles, authors or admin_users.
SELECT tablename, policyname, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('articles', 'authors', 'admin_users')
ORDER BY tablename, policyname;
