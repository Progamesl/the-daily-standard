-- Advertising slots for the site.
--
-- The admin has had a full Ads page since it was written, but this table has
-- never existed on the database, so every save failed and every list came back
-- empty. Run this once in the Supabase SQL editor and the page starts working.
--
-- Reading is open to everybody, because the public site has to render the ads.
-- Writing is limited to signed-in staff.

CREATE TABLE IF NOT EXISTS ads (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  advertiser  TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  link_url    TEXT NOT NULL DEFAULT '',
  placement   TEXT NOT NULL DEFAULT 'sidebar',
  active      BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ads_active_placement_idx ON ads (active, placement);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads readable by everyone" ON ads;
CREATE POLICY "ads readable by everyone"
  ON ads FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "ads writable by staff" ON ads;
CREATE POLICY "ads writable by staff"
  ON ads FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::text AND admin_users.active))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()::text AND admin_users.active));
