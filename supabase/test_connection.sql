-- Test Supabase Connection and Data Access
-- Run this in Supabase SQL Editor to verify everything is working

-- 1. Check if articles table exists and has data
SELECT COUNT(*) as article_count FROM articles;

-- 2. Check if authors table exists and has data
SELECT COUNT(*) as author_count FROM authors;

-- 3. Try to read articles (this will fail if RLS is blocking)
SELECT id, headline, status FROM articles LIMIT 5;

-- 4. Check current RLS policies on articles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'articles';

-- 5. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('articles', 'authors');

-- Expected results:
-- - article_count should be > 0 (if you migrated)
-- - author_count should be > 0 (if you migrated)
-- - SELECT should return rows (if RLS policies allow anon access)
-- - RLS policies should include "Allow anon access to articles"
-- - rowsecurity should be 't' (true) for both tables
