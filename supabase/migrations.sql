-- Supabase Migration Script
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates all the tables needed for The Octagon CMS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  headline TEXT NOT NULL,
  dek TEXT,
  body TEXT NOT NULL,
  image TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  image_caption TEXT,
  section TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  reading_time INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT DEFAULT 'normal',
  featured BOOLEAN DEFAULT FALSE,
  
  -- Editorial workflow
  assigned_to_id TEXT,
  assigned_to_name TEXT,
  assigned_by_id TEXT,
  reviewed_by_id TEXT,
  deadline TIMESTAMPTZ,
  pitch_summary TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  og_image TEXT,
  canonical_url TEXT,
  
  -- Editorial notes & history
  internal_notes JSONB DEFAULT '[]'::jsonb,
  revisions JSONB DEFAULT '[]'::jsonb,
  word_count INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Authors table
CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  image TEXT,
  email TEXT,
  twitter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  section TEXT,
  bio TEXT,
  avatar TEXT,
  phone TEXT,
  graduation_year TEXT,
  active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  password_expires_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Login attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  ip TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  user_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id TEXT,
  user_display_name TEXT,
  target_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics views table
CREATE TABLE IF NOT EXISTS article_views (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  article_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration INTEGER,
  scroll_depth INTEGER,
  referrer TEXT,
  user_agent TEXT
);

-- Analytics engagement table
CREATE TABLE IF NOT EXISTS article_engagement (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  article_id TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_section ON articles(section);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp);
CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_article_views_timestamp ON article_views(timestamp);
CREATE INDEX IF NOT EXISTS idx_article_engagement_article_id ON article_engagement(article_id);

-- Row Level Security (RLS) policies
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_engagement ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to published articles
CREATE POLICY "Public can read published articles" ON articles
  FOR SELECT USING (status = 'published');

-- Policy: Allow public read access to authors
CREATE POLICY "Public can read authors" ON authors
  FOR SELECT USING (true);

-- Policy: Allow authenticated users (admin) full access to articles
CREATE POLICY "Admins can manage articles" ON articles
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users (admin) full access to authors
CREATE POLICY "Admins can manage authors" ON authors
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy: Only admins can access admin_users table
CREATE POLICY "Admins can manage users" ON admin_users
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy: Allow public to insert views (for analytics)
CREATE POLICY "Public can insert views" ON article_views
  FOR INSERT WITH CHECK (true);

-- Policy: Only admins can read views
CREATE POLICY "Admins can read views" ON article_views
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow public to insert engagement
CREATE POLICY "Public can insert engagement" ON article_engagement
  FOR INSERT WITH CHECK (true);

-- Policy: Only admins can read engagement
CREATE POLICY "Admins can read engagement" ON article_engagement
  FOR SELECT USING (auth.role() = 'authenticated');
