-- ═══════════════════════════════════════════════════════════════════════════
--  STEP 1 of 2 — Create the first real staff account
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
--  BEFORE running this, create the login itself:
--    Dashboard → Authentication → Users → "Add user" → "Create new user"
--      • Email:    your email
--      • Password: choose one
--      • ✅ tick "Auto Confirm User"   (otherwise you can't sign in yet)
--
--  Then edit the three values below and run this file. It links that login to
--  an Octagon staff profile with the super_admin role.
--
--  Safe to re-run: it updates the existing row instead of creating duplicates.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ▼▼▼ EDIT THESE THREE ▼▼▼
  target_email TEXT := 'siddharthshukla1010@gmail.com';
  target_name  TEXT := 'Sid Shukla';
  target_user  TEXT := 'sid';
  -- ▲▲▲ EDIT THESE THREE ▲▲▲

  auth_id UUID;
BEGIN
  SELECT id INTO auth_id
  FROM auth.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;

  IF auth_id IS NULL THEN
    RAISE EXCEPTION
      'No Supabase Auth user found for %. Create it first: Authentication → Users → Add user (tick Auto Confirm User).',
      target_email;
  END IF;

  -- Clear any legacy row that would collide on the UNIQUE username.
  DELETE FROM admin_users
  WHERE username = target_user
    AND id <> auth_id::text;

  INSERT INTO admin_users (
    id, username, password_hash, display_name, email,
    role, active, email_verified, approved_by, approved_at
  )
  VALUES (
    auth_id::text,
    target_user,
    -- Passwords live in Supabase Auth. This column is NOT NULL in the original
    -- schema, so it holds a marker rather than any credential material.
    'managed_by_supabase_auth',
    target_name,
    target_email,
    'super_admin',
    TRUE,
    TRUE,
    'bootstrap',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username      = EXCLUDED.username,
    display_name  = EXCLUDED.display_name,
    email         = EXCLUDED.email,
    role          = 'super_admin',
    active        = TRUE,
    email_verified = TRUE,
    updated_at    = NOW();

  RAISE NOTICE 'OK — % is now a super_admin (auth id %).', target_email, auth_id;
END $$;

-- Verify (should return exactly one row, active = true, role = super_admin):
SELECT id, username, display_name, email, role, active
FROM admin_users
ORDER BY created_at;
