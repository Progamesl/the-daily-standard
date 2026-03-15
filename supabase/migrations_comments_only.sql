-- Run this in Supabase SQL Editor if public.comments is missing
-- (Dashboard → SQL Editor → New Query → paste → Run)

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON public.comments(article_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running (avoids duplicate policy errors)
DROP POLICY IF EXISTS "Public can read approved comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can submit comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON public.comments;

CREATE POLICY "Public can read approved comments" ON public.comments
  FOR SELECT USING (approved = true);

CREATE POLICY "Anyone can submit comments" ON public.comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all comments" ON public.comments
  FOR ALL USING (auth.role() = 'authenticated');

-- Reload schema cache so API sees the new table (Supabase may do this automatically)
NOTIFY pgrst, 'reload schema';
