# Restore All Stories

## The Problem
Only 10 stories are showing because:
1. `octagonData.json` was replaced with only 10 stories during "sync to code"
2. Supabase only has 10 stories (from migration)
3. HEADLESS CMS uses Supabase as source of truth

## Solution: Migrate ALL Stories to Supabase

### Step 1: Check What's in localStorage
1. Go to Admin → Settings
2. Click "Export All Data (Backup)"
3. Check how many articles are in the export

### Step 2: Migrate Everything to Supabase
1. Go to Admin → Settings
2. Scroll to "Long-Term Solution: Supabase Database"
3. Click "Migrate All Data to Supabase"
4. This will upload ALL articles from localStorage to Supabase

### Step 3: Verify
1. After migration, refresh the page
2. Stories should now appear everywhere

## If You Have More Stories Elsewhere

If you have stories in:
- A backup file
- Another browser's localStorage
- An old export

You can:
1. Import them via Admin → Settings → "Import Data"
2. Then migrate to Supabase

## Going Forward

With HEADLESS CMS:
- All new stories go to Supabase automatically
- Stories appear everywhere instantly
- No need for "sync to code" anymore
