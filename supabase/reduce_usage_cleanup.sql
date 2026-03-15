-- Supabase usage reduction script (free tier 5 GB)
-- Run in SQL Editor. Run "Diagnostics" first, then "Cleanup" sections as needed.
-- See docs/SUPABASE_REDUCE_USAGE.md for full guidance.

-- =============================================================================
-- DIAGNOSTICS: See what's using space (run this first)
-- =============================================================================

SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Row counts for likely heavy tables (optional)
-- SELECT 'article_views' AS tbl, COUNT(*) FROM article_views
-- UNION ALL SELECT 'article_engagement', COUNT(*) FROM article_engagement
-- UNION ALL SELECT 'login_attempts', COUNT(*) FROM login_attempts
-- UNION ALL SELECT 'user_sessions', COUNT(*) FROM user_sessions
-- UNION ALL SELECT 'articles', COUNT(*) FROM articles;

-- =============================================================================
-- CLEANUP 1: Analytics (often largest) – keeps last 90 days
-- =============================================================================

-- DELETE FROM article_views WHERE timestamp < NOW() - INTERVAL '90 days';
-- DELETE FROM article_engagement WHERE timestamp < NOW() - INTERVAL '90 days';
-- VACUUM FULL article_views;
-- VACUUM FULL article_engagement;

-- =============================================================================
-- CLEANUP 2: Login attempts and expired sessions
-- =============================================================================

-- DELETE FROM login_attempts WHERE timestamp < NOW() - INTERVAL '30 days';
-- DELETE FROM user_sessions WHERE expires_at < NOW();
-- VACUUM FULL login_attempts;
-- VACUUM FULL user_sessions;

-- =============================================================================
-- CLEANUP 3: Activity log and security alerts – keeps last 90 days
-- =============================================================================

-- DELETE FROM activity_log WHERE timestamp < NOW() - INTERVAL '90 days';
-- DELETE FROM security_alerts WHERE timestamp < NOW() - INTERVAL '90 days';
-- VACUUM FULL activity_log;
-- VACUUM FULL security_alerts;

-- =============================================================================
-- NUCLEAR OPTION: Delete ALL data from analytics/sessions/logs (no retention)
-- Use this if you're okay losing every view, engagement, login attempt,
-- session, activity log, and security alert. Tables stay; data is gone.
-- Run DIAGNOSTICS first to see if this will free enough (e.g. if articles
-- is still the biggest table, you may need to trim articles too).
-- =============================================================================

-- TRUNCATE empties the table and resets sequences; then VACUUM FULL reclaims disk.
-- TRUNCATE article_views;
-- TRUNCATE article_engagement;
-- TRUNCATE login_attempts;
-- TRUNCATE user_sessions;
-- TRUNCATE activity_log;
-- TRUNCATE security_alerts;
-- VACUUM FULL article_views;
-- VACUUM FULL article_engagement;
-- VACUUM FULL login_attempts;
-- VACUUM FULL user_sessions;
-- VACUUM FULL activity_log;
-- VACUUM FULL security_alerts;

-- =============================================================================
-- After cleanup, run DIAGNOSTICS again to confirm sizes dropped.
-- Dashboard → Reports/Usage may take a few minutes to update.
-- =============================================================================
