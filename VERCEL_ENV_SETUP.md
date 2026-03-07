# Setting Up Environment Variables in Vercel

## The Problem
Your `.env` file only works for local development. Vercel needs environment variables configured in their dashboard.

## Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your project: `the-daily-standard` (or whatever it's named)
3. Click on it

### Step 2: Open Settings
1. Click **"Settings"** tab at the top
2. Click **"Environment Variables"** in the left sidebar

### Step 3: Add Your Supabase Credentials
Add these TWO environment variables:

**Variable 1:**
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://pasmllgdewtgqfwgsmjg.supabase.co`
- **Environment:** Select all (Production, Preview, Development)

**Variable 2:**
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhc21sbGdkZXd0Z3Fmd2dzbWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDI5MjQsImV4cCI6MjA4ODQ3ODkyNH0.fGo-qqScK-eBCtiGuXssUJrTBitVRP2NANlYuJcGxCY`
- **Environment:** Select all (Production, Preview, Development)

### Step 4: Redeploy
After adding the variables:
1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or just push a new commit to trigger a new deployment

### Step 5: Verify
After redeployment completes:
1. Go to your live site: `scdsoctagon.net/admin`
2. Go to Settings
3. You should now see "✅ Supabase is configured!"

---

## Quick Checklist:
- [ ] Added `VITE_SUPABASE_URL` to Vercel
- [ ] Added `VITE_SUPABASE_ANON_KEY` to Vercel
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Redeployed the site
- [ ] Verified it works on live site

---

**Note:** Environment variables are case-sensitive! Make sure `VITE_` prefix is uppercase.
