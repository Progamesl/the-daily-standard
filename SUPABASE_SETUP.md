# Supabase Setup Guide

## Why Supabase?

Your current setup uses **localStorage**, which means:
- ❌ Data only exists in the browser you use
- ❌ Switching browsers/devices = data is gone
- ❌ Clearing browser data = data is gone
- ❌ No real persistence

**Supabase gives you:**
- ✅ True database (PostgreSQL) - data persists forever
- ✅ Works across all browsers and devices
- ✅ Real-time sync
- ✅ Free tier (generous limits)
- ✅ Built-in auth, storage, and more

## Setup Steps

### 1. Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (easiest)
4. Create a new project
   - Name: `octagon-cms` (or whatever you want)
   - Database password: (save this!)
   - Region: Choose closest to you
   - Wait 2-3 minutes for setup

### 2. Get Your Credentials
1. In your Supabase project dashboard
2. Go to **Settings** → **API**
3. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string)

### 3. Run Database Migration
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open `supabase/migrations.sql` from this project
4. Copy the entire SQL file
5. Paste into SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success" message

### 4. Install Supabase Package
```bash
npm install @supabase/supabase-js
```

### 5. Configure Environment Variables
1. Create `.env` file in project root (if it doesn't exist)
2. Add:
```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
3. **IMPORTANT:** Add `.env` to `.gitignore` (don't commit secrets!)

### 6. Restart Dev Server
```bash
npm run dev
```

### 7. Migrate Your Data
1. Go to Admin → Settings
2. Scroll to "Supabase Migration" section
3. Click "Migrate All Data to Supabase"
4. Wait for success message
5. Your data is now in Supabase! 🎉

## How It Works

- **Hybrid System:** Works with both Supabase (when configured) and localStorage (fallback)
- **Auto-Sync:** When you save articles/authors, they're saved to both localStorage AND Supabase
- **Offline Support:** If Supabase is down, localStorage still works
- **Migration:** One-click migration moves all existing data to Supabase

## After Migration

Once migrated:
- ✅ Your data is safe in Supabase
- ✅ Works on any browser/device
- ✅ No more data loss
- ✅ Can access from anywhere

## Troubleshooting

**"Supabase not configured" error:**
- Check `.env` file exists and has correct values
- Restart dev server after creating `.env`
- Make sure variable names start with `VITE_`

**Migration fails:**
- Make sure you ran the SQL migration script
- Check Supabase dashboard for any errors
- Verify your anon key is correct

**Data not syncing:**
- Check browser console for errors
- Verify Supabase project is active (not paused)
- Check network tab for failed requests

## Next Steps

After Supabase is working:
1. ✅ Your data is now persistent!
2. Consider adding Supabase Storage for images
3. Consider using Supabase Auth (better than current system)
4. Add real-time features (live collaboration)

---

**Need help?** Check Supabase docs: https://supabase.com/docs
