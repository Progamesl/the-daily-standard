# The Octagon CMS — Production-Readiness Build Plan

Goal: a genuinely reliable, NYT-grade custom CMS where editors upload stories and
they appear correctly and near-instantly across the whole site, plus a bulk
backlog-import path (from Google Docs) and a visual/UX polish pass — all before the
school year starts. Approach: **harden and extend the existing app**, not rebuild.

Branch: `cms-hardening`. Everything ships branch → Vercel preview → verify → merge.

---

## The one architectural decision that ties it together

The CMS writes to Supabase with the **public anon key**. The original schema
(`supabase/migrations.sql`) has correct RLS (writes require an authenticated role),
but because the browser client is never authenticated, someone applied
`supabase/fix_rls_policies.sql` which opens `articles`, `authors`, and `admin_users`
to `FOR ALL USING(true)` — i.e. anyone with the public key (shipped in the JS
bundle) can read/write/delete everything.

**Fix:** wire the *already-built-but-unused* Supabase Auth (`src/lib/auth.ts`,
`AuthContext`) as the real admin gate → the browser client carries an authenticated
JWT → CMS writes satisfy the original policies → **revert `fix_rls_policies.sql`**.
Terminal/import scripts use the **service-role key** (server/CLI only). This is why
the order is **A → B → C**.

---

## Phase 0 — Same-day quick wins (zero-risk)
- [x] Register the Tailwind Typography plugin (was installed but not registered, so
      every `prose` class — all article body styling — was inert). `tailwind.config.ts`
- [ ] Replace the `encrypted-tbn0.gstatic.com` thumbnail used as site logo /
      author-avatar fallback / OG image with real self-hosted assets.
- [ ] Remove/fix the dead "Load More" button and unlinked "Related Topics" tags.

## Phase A — Instant publish across the whole site (the #1 ask)
Root cause: `DataSyncProvider` was mounted only on `/admin`, so public pages never
read the R2 article list and never live-updated; and the post-save refresh listeners
were dead code after an early `return`.
- [x] A1 — Mount one `DataSyncProvider` around all routes. `src/App.tsx`
- [x] A2 — Route-reactive `isAdminPath` via `useLocation`; move the save/data-loaded
      listeners into their own effect so they attach; 30s visible-tab public poll.
      `src/contexts/DataSyncContext.tsx`
- [x] A3 — `AuthorPage` subscribes to `syncVersion`. `src/pages/AuthorPage.tsx`
- [x] A4 — Search reads live public articles (R2) + author/tag matching + `syncVersion`
      dep. `src/components/search/SearchDialog.tsx`
- [ ] A5 — `StaffPage` swap (low priority).
- [ ] A6 — (optional) `api/sync-r2.js` list edge cache `max-age=15, s-w-r=60`.

Freshness SLA: editor's own tab ~1.5s; other visitors ~30s (poll) + edge cache.
Pre-flight (verified): `VITE_R2_PUBLIC_BASE_URL` is set on the Vercel project.

## Phase B — Real per-user auth + RLS lockdown
Wire `AdminLogin`/`AdminLayout` to `useAuth()`; retire the localStorage auth +
fake verification code; seed real Supabase Auth accounts per staff member; revert
the open RLS policies; auth the `/api/sync-r2` and `/api/upload-image` endpoints;
role-gate destructive actions.

## Phase C — Google Docs backlog import (after B)
One backlog sheet/`.docx` → prepared JSON + HTML preview → import as **drafts** →
review in Admin → one-click publish. Shared `scripts/lib/` (canonical author
resolver, R2 image uploader, DOCX→HTML with image upload, CSV/XLSX parser). New
`AdminBulkImport` page for a no-terminal path. Upsert by `slug` (`onConflict`),
service-role key, collision-safe slugs. Fix the lossy DOCX importer (uploads images
to R2 instead of stripping base64).

## Phase D — Editor + visual/UX refinements
Wire the orphaned editor panels (publish date, workflow, SEO, revision-restore);
fix autosave re-publishing every 5s; reliable Preview; DOMPurify sanitize; drop the
Imgur/base64 image fallback; per-article OG/meta serverless route; design polish.

---

## Owner decisions still open
1. Publishing model: **explicit-publish** (edits to a live story stay a working copy
   until you hit Publish) vs. live-editing. Affects autosave (D2) + A. *Recommended: explicit.*
2. Auth: simple "any admin edits anything" vs. **full role matrix**. *Recommended: matrix.*
3. Staff roster + roles for account seeding (needed for B).
4. Backlog delivery: `.docx` + CSV (reliable) vs. live Google-Doc-link fetching (brittle).
5. Import default: drafts-first (review before live) vs. auto-publish. *Recommended: drafts.*
6. Backfill the 572 seed articles' remote hotlinked images to R2 now or later.
