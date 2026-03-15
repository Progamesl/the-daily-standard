# Reducing Supabase Usage (Free Tier 5 GB)

Use this guide when you're over the free tier (database size, **egress**, or storage) so your project isn't paused (402 errors).

## If the problem is **Egress** (bandwidth)

Egress = data transferred **out** of Supabase (every API response to the browser). It adds up because:

- **Every request** = bytes sent (list of articles, one article body, comments, auth, etc.).
- **Traffic × size**: 100 visitors × 10 pages = 1000 responses. Each article body can be 50–200 KB.
- **Bots/crawlers** (Google, etc.) hit your pages too; they don’t share a “cache” with users, so each crawl = full egress.
- **Short cache** used to refetch the list every 10–30 sec; that’s been increased to 15 min so the same data isn’t re-downloaded constantly.

The app is already optimized to reduce egress:

- **List-only fetch**: Loading articles from Supabase fetches only list fields (no `body`, `internal_notes`, or `revisions`). That keeps list/home/section pages and admin story list under the limit.
- **On-demand full article**: The **public article page** fetches one article by slug when you view it. The **admin story editor** fetches one full article by id when you open it. So only the article you're viewing uses full-body egress.

If you're still over egress limits:
- Lengthen cache TTL in `useArticles` / `useSupabaseArticles` so the app refetches less often.
- Put a CDN in front of the site so repeat visitors get cached responses instead of hitting Supabase every time.
- Consider upgrading to Supabase Pro for higher egress.

---

## If the problem is **Database size** or **Storage**

### 1. See where usage is coming from

In Supabase: **Dashboard → Reports** (or **Settings → Usage**) shows:
- **Database** size
- **Storage** size (if you use Storage buckets)
- **Auth** (users count; usually small)

To see **per-table** database size, run this in **SQL Editor**:

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

To include **auth** and **storage** schema:

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

Note which tables are largest (often `articles`, `article_views`, `article_engagement`, `login_attempts`).

---

## 2. Safe Cleanups (Do These First)

Run in **SQL Editor**, one block at a time. Back up or export important data first if needed.

### A. Prune old analytics (often the biggest win)

**article_views** and **article_engagement** can grow very fast. Keep e.g. last 90 days only:

```sql
-- How many rows and rough size?
SELECT COUNT(*) AS views_count FROM article_views;
SELECT COUNT(*) AS engagement_count FROM article_engagement;

-- Delete article_views older than 90 days
DELETE FROM article_views WHERE timestamp < NOW() - INTERVAL '90 days';

-- Delete article_engagement older than 90 days
DELETE FROM article_engagement WHERE timestamp < NOW() - INTERVAL '90 days';

-- Reclaim disk (important so size actually drops)
VACUUM FULL article_views;
VACUUM FULL article_engagement;
```

You can use `60 days` or `30 days` if you need to free more space.

### B. Prune old login attempts and sessions

```sql
-- Old login attempts (e.g. keep 30 days)
DELETE FROM login_attempts WHERE timestamp < NOW() - INTERVAL '30 days';

-- Expired sessions
DELETE FROM user_sessions WHERE expires_at < NOW();

VACUUM FULL login_attempts;
VACUUM FULL user_sessions;
```

### C. Prune old activity log and security alerts

```sql
-- Keep last 90 days
DELETE FROM activity_log WHERE timestamp < NOW() - INTERVAL '90 days';
DELETE FROM security_alerts WHERE timestamp < NOW() - INTERVAL '90 days';

VACUUM FULL activity_log;
VACUUM FULL security_alerts;
```

### D. Optional: trim very old comments

Only if you don’t need them:

```sql
-- Example: delete unapproved comments older than 1 year
DELETE FROM comments WHERE approved = false AND created_at < NOW() - INTERVAL '1 year';
VACUUM FULL comments;
```

---

## 3. If the `articles` Table Is Huge

Articles store `body` (full HTML) and `images` (JSONB). They can add up to many GB.

Options:

- **Export and archive**: Export old articles to JSON/backup, then delete them from Supabase (only if you’re sure you don’t need them in the DB).
- **Short term**: Don’t delete yet; do all the cleanups above and run `VACUUM FULL articles` after any big delete. Then re-check usage.

To see size and row count:

```sql
SELECT COUNT(*) FROM articles;
SELECT pg_size_pretty(pg_total_relation_size('public.articles')) AS articles_size;
```

---

## 4. Storage Buckets (If You Use Them)

If **Storage** is part of your 8.5 GB:

- In **Dashboard → Storage**, see which buckets exist and their size.
- Delete unneeded files or old versions.
- Don’t store large assets in Supabase if you can use a CDN or external storage instead.

---

## 5. After Each Cleanup

- Run the **table size** query again to confirm sizes went down.
- Check **Reports / Usage** in the dashboard; it may take a short time to update.
- Aim to get **total usage below 5 GB** and keep a small buffer.

---

## 6. If You Still Can’t Get Under 5 GB

- **Upgrade to Pro** (~$25/month): higher included database size and no hard 5 GB cap in the same way. Easiest if you want to keep Supabase and not change architecture.
- **Move database elsewhere**: Export data, create a Postgres DB (e.g. Neon, Railway, self‑hosted) and point the app to it. Requires changing connection string and possibly some API usage.
- **Hybrid**: Keep Supabase for Auth + small tables, move large tables (e.g. articles, analytics) to another Postgres or storage. Bigger code and ops change.

---

## 7. Prevent It From Growing Back

- **Retention policy**: Periodically run the same deletes (e.g. monthly) for `article_views`, `article_engagement`, `login_attempts`, `user_sessions`, `activity_log`, `security_alerts`. You can do this via a cron (e.g. Supabase Edge Function on a schedule, or an external cron calling an API that runs the deletes).
- **Limit analytics**: Cap how long you keep view/engagement data (e.g. 90 days) and document it so the team doesn’t expect “forever” history.
- **Images**: Prefer storing image URLs in the DB and hosting files on a CDN or object storage, not in Supabase Storage, if that’s contributing a lot.

---

**Summary:** Run the size queries to see what’s big, then prune analytics, login attempts, sessions, and logs (with `VACUUM FULL`). Recheck usage; if `articles` or Storage dominate, consider archive/offload or upgrading.
