-- Add the cinematic article flag used by src/lib/supabaseDataService.ts.
-- Run this once against existing Supabase projects created before the column existed.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS is_cinematic BOOLEAN DEFAULT FALSE;
