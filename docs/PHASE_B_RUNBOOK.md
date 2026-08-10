# Phase B runbook — switching on real staff logins

Branch: `phase-b-auth`. Do these in order. Steps 1–2 are the only ones that
need you; everything else is verification.

**Why the order matters:** the code now requires a real Supabase login. Until a
staff account exists, nobody can get into `/admin` — so create the account
*before* this reaches production, and lock the database down *after* you've
confirmed you can sign in.

---

## 1. Create your login (Supabase dashboard, ~30 seconds)

Dashboard → **Authentication** → **Users** → **Add user** → *Create new user*

- Email: your email
- Password: pick one (10+ characters)
- ✅ **tick "Auto Confirm User"** — without this you cannot sign in yet

## 2. Link it to a staff profile

Dashboard → **SQL Editor** → New query → paste **`supabase/01_bootstrap_admin.sql`**,
edit the three values at the top (email / name / username), and Run.

It should print `OK — … is now a super_admin` and list your row.

## 3. Check you can sign in (on the preview, not the live site)

Go to the preview deployment's `/admin/login`, sign in with the email and
password from step 1. You should land in the dashboard with your name and
**Super Admin** in the sidebar.

If it says *"This email is not set up as an Octagon staff account"*, step 2
didn't link — the `admin_users.id` must equal the auth user's id. Re-run step 2.

## 4. Ship it to the live site

Merge `phase-b-auth` into `main` and push. The live CMS now uses real logins.
The database is still open at this point — that's deliberate, so this step can
be verified on its own.

## 5. Close the open database

Dashboard → SQL Editor → paste **`supabase/02_lockdown_rls.sql`** → Run.

Then verify, signed in on the live site:

- Open an existing story, make a trivial edit, save → it should save.
- Publish something → it should appear on the homepage.
- Sign out and open the homepage → articles still render.
- Sign out and open `/admin` → you're redirected to the login page.

If saving breaks, **don't panic and don't leave it broken** — run
`supabase/03_rollback_rls.sql` to reopen access, then check:

```sql
SELECT public.is_active_admin();          -- must be true while signed in
SELECT id, email, role, active FROM admin_users;
SELECT id, email FROM auth.users;         -- ids must match admin_users.id
```

---

## Adding the rest of the staff

Two options:

- **Repeat steps 1–2** for each person, changing `target_email` / `target_name`
  / `target_user`, and changing `'super_admin'` to their role.
- **`/api/staff`** (already deployed) does this properly from the CMS — it
  creates the login and the profile together, enforces that you can only manage
  people below your own role, and cleans up after itself on failure. The Staff
  screen still needs to be pointed at it; that's the next piece of work.

Roles, most to least senior: `super_admin`, `editor_in_chief`, `managing_editor`,
`section_editor`, `reporter`, `photographer`. Publishing requires
`section_editor` or above; managing staff requires `editor_in_chief` or above.

> `/api/staff` needs `SUPABASE_SERVICE_ROLE_KEY`, which is currently set on
> **production only**. It will report "not configured" on preview deployments
> until that variable is also added to the preview environment.

---

## What changed in the code

- Identity lives in Supabase Auth, so accounts are shared across devices instead
  of being seeded per-browser in `localStorage`.
- Removed: the seeded default super admin (`admin` / a fixed password) that was
  written into every visitor's browser, and the shared "email verification"
  code that was hardcoded in the public bundle.
- `supabaseDataService` now shares one Supabase client with the auth layer.
  It previously created its own, so article writes ran on a *different*,
  unauthenticated client — which would have failed the moment RLS started
  requiring a signed-in user. This was the main hidden blocker to step 5.
- Sign-in no longer waits on an external IP-geolocation call before returning.
