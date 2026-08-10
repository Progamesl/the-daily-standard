-- ═══════════════════════════════════════════════════════════════════════════
--  STEP 3 — Repair the staff-table policies
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Run this after 02_lockdown_rls.sql. Plain statements only.
--
--  TWO PROBLEMS THIS FIXES, both found by actually attacking the database
--  (scripts/verify-rls.mjs) rather than by reading the policy list:
--
--  1. Signed-in staff got HTTP 403 "permission denied for table users" when
--     reading the staff roster. Two pre-existing policies —
--     admin_users_self_read / admin_users_self_update — evaluate a subquery
--     against auth.users, which the `authenticated` role has no rights to read.
--     A policy that throws blocks the whole query, so the Staff screen and the
--     assignment dropdowns were broken for everyone.
--
--  2. "Staff manage users" granted ALL operations to any active staff member,
--     because is_active_admin() only checks that the account is active — not
--     what role it holds. Once problem 1 was fixed, a reporter could have
--     UPDATEd their own row and set role = 'super_admin'. Writes are now
--     restricted to editors-in-chief and super admins, and only a super admin
--     can mint another super admin.
--
--  Reading the roster stays open to all active staff: the editor needs it for
--  author and assignee dropdowns.
-- ═══════════════════════════════════════════════════════════════════════════

-- Is the caller senior enough to manage staff accounts?
-- Mirrors MANAGE_USERS_LEVEL in api/staff.js (editor_in_chief and above).
-- SECURITY DEFINER for the same reason as is_active_admin(): it reads
-- admin_users from inside a policy on admin_users.
CREATE OR REPLACE FUNCTION public.is_staff_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()::text
      AND active
      AND role IN ('super_admin', 'editor_in_chief')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()::text
      AND active
      AND role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_manager() FROM public;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_staff_manager() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;

-- ── admin_users ─────────────────────────────────────────────────────────────
-- Remove the legacy policies that reference auth.users and throw 42501.
DROP POLICY IF EXISTS "admin_users_self_read"   ON admin_users;
DROP POLICY IF EXISTS "admin_users_self_update" ON admin_users;

-- Replace the over-broad catch-all from step 2.
DROP POLICY IF EXISTS "Staff manage users"   ON admin_users;
DROP POLICY IF EXISTS "Staff read roster"    ON admin_users;
DROP POLICY IF EXISTS "Managers add staff"   ON admin_users;
DROP POLICY IF EXISTS "Managers edit staff"  ON admin_users;
DROP POLICY IF EXISTS "Managers remove staff" ON admin_users;

-- Any active staff member may read the roster (needed for assignment UI).
CREATE POLICY "Staff read roster" ON admin_users
  FOR SELECT USING (public.is_active_admin());

-- Only editors-in-chief and super admins may change staff records, and only a
-- super admin may create or promote another super admin.
CREATE POLICY "Managers add staff" ON admin_users
  FOR INSERT WITH CHECK (
    public.is_staff_manager()
    AND (role <> 'super_admin' OR public.is_super_admin())
  );

CREATE POLICY "Managers edit staff" ON admin_users
  FOR UPDATE USING (public.is_staff_manager())
  WITH CHECK (
    public.is_staff_manager()
    AND (role <> 'super_admin' OR public.is_super_admin())
  );

CREATE POLICY "Managers remove staff" ON admin_users
  FOR DELETE USING (public.is_staff_manager());

-- ── Verify ──────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual::text AS using_expr, with_check::text AS with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'admin_users'
ORDER BY policyname;
