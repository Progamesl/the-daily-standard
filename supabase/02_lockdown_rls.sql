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

-- ── articles ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anon access to articles" ON articles;   -- the hole
DROP POLICY IF EXISTS "Admins can manage articles"    ON articles;
DROP POLICY IF EXISTS "Public can read published articles" ON articles;
DROP POLICY IF EXISTS "Staff manage articles"         ON articles;

-- Readers (and /api/sync-r2, which uses the anon key) see published stories only.
CREATE POLICY "Public can read published articles" ON articles
  FOR SELECT USING (status = 'published');

-- Staff get full control, including drafts.
CREATE POLICY "Staff manage articles" ON articles
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ── authors ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anon access to authors" ON authors;     -- the hole
DROP POLICY IF EXISTS "Admins can manage authors"    ON authors;
DROP POLICY IF EXISTS "Public can read authors"      ON authors;
DROP POLICY IF EXISTS "Staff manage authors"         ON authors;

CREATE POLICY "Public can read authors" ON authors
  FOR SELECT USING (true);

CREATE POLICY "Staff manage authors" ON authors
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ── admin_users (the staff table — was fully world-readable) ────────────────
DROP POLICY IF EXISTS "Allow anon access to admin_users" ON admin_users;  -- the hole
DROP POLICY IF EXISTS "Admins can manage users"          ON admin_users;
DROP POLICY IF EXISTS "Staff read own profile"           ON admin_users;
DROP POLICY IF EXISTS "Staff manage users"               ON admin_users;

-- Every signed-in staff member can read their own row. This is what lets
-- sign-in resolve a profile even before is_active_admin() is satisfied.
CREATE POLICY "Staff read own profile" ON admin_users
  FOR SELECT USING (id = auth.uid()::text);

-- Active staff can read the roster and manage accounts.
CREATE POLICY "Staff manage users" ON admin_users
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ── analytics: public may write, staff may read ─────────────────────────────
DROP POLICY IF EXISTS "Allow anon to read views"      ON article_views;   -- the hole
DROP POLICY IF EXISTS "Admins can read views"         ON article_views;
DROP POLICY IF EXISTS "Public can insert views"       ON article_views;
DROP POLICY IF EXISTS "Staff read views"              ON article_views;

CREATE POLICY "Public can insert views" ON article_views
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read views" ON article_views
  FOR SELECT USING (public.is_active_admin());

DROP POLICY IF EXISTS "Allow anon to read engagement" ON article_engagement;  -- the hole
DROP POLICY IF EXISTS "Admins can read engagement"    ON article_engagement;
DROP POLICY IF EXISTS "Public can insert engagement"  ON article_engagement;
DROP POLICY IF EXISTS "Staff read engagement"         ON article_engagement;

CREATE POLICY "Public can insert engagement" ON article_engagement
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read engagement" ON article_engagement
  FOR SELECT USING (public.is_active_admin());

-- ── comments ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all comments"   ON comments;
DROP POLICY IF EXISTS "Staff manage comments"            ON comments;
DROP POLICY IF EXISTS "Public can read approved comments" ON comments;
DROP POLICY IF EXISTS "Anyone can submit comments"        ON comments;

CREATE POLICY "Public can read approved comments" ON comments
  FOR SELECT USING (approved = true);
CREATE POLICY "Anyone can submit comments" ON comments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff manage comments" ON comments
  FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ── Tables that had RLS enabled but NO policies at all (deny-all). ──────────
-- These admin features silently failed for everyone. Give staff real access.
DROP POLICY IF EXISTS "Staff manage settings" ON site_settings;
CREATE POLICY "Staff manage settings" ON site_settings
  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Staff read activity"  ON activity_log;
DROP POLICY IF EXISTS "Staff write activity" ON activity_log;
CREATE POLICY "Staff read activity" ON activity_log
  FOR SELECT USING (public.is_active_admin());
CREATE POLICY "Staff write activity" ON activity_log
  FOR INSERT WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Staff read alerts"   ON security_alerts;
DROP POLICY IF EXISTS "Staff manage alerts" ON security_alerts;
CREATE POLICY "Staff manage alerts" ON security_alerts
  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- login_attempts: the app records FAILED sign-ins, which by definition happen
-- while still anonymous, so INSERT must be open. Reading is staff-only.
-- (Trade-off: an open INSERT can be spammed. Reads, which are the sensitive
-- part, stay locked. Revoke the insert policy if abuse ever shows up.)
DROP POLICY IF EXISTS "Anyone can record login attempts" ON login_attempts;
DROP POLICY IF EXISTS "Staff read login attempts"        ON login_attempts;
CREATE POLICY "Anyone can record login attempts" ON login_attempts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff read login attempts" ON login_attempts
  FOR SELECT USING (public.is_active_admin());

DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions"    ON user_sessions;
DROP POLICY IF EXISTS "Staff manage sessions"             ON user_sessions;
CREATE POLICY "Staff manage sessions" ON user_sessions
  FOR ALL USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Nothing below should list a policy whose qualifier is just `true` for an
-- UPDATE/DELETE/ALL command on articles, authors or admin_users.
SELECT tablename, policyname, cmd, qual::text AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('articles', 'authors', 'admin_users')
ORDER BY tablename, policyname;
