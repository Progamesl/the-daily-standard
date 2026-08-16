-- The masthead, stored with the people it describes.
--
-- The staff page has always been a hardcoded TypeScript file, so adding a
-- staffer or fixing a bio meant a code change and a deploy — which the newsroom
-- cannot do. These columns move it into the database alongside the authors who
-- are already there, so it can be edited from the admin like everything else.
--
-- Deliberately added to `authors` rather than a new `staff` table: 13 of the 14
-- people checked were already authors, because staffers have bylines. A
-- separate table would mean two records per person and two bios that drift
-- apart. One person, one row, edited in one place.
--
-- Row-level security is already correct for this and needs no change: authors
-- is public-read (the masthead has to render for visitors) and staff-write.

ALTER TABLE authors ADD COLUMN IF NOT EXISTS primary_section TEXT;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS alt_sections JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE authors ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Who appears on /staff. Everyone who has ever written for the paper is an
-- author; only this year's masthead is on it.
ALTER TABLE authors ADD COLUMN IF NOT EXISTS on_masthead BOOLEAN NOT NULL DEFAULT FALSE;

-- Order within a section, so an editor can put the editors-in-chief in the
-- order they want rather than alphabetically.
ALTER TABLE authors ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS authors_masthead_idx ON authors (on_masthead, primary_section, sort_order);
