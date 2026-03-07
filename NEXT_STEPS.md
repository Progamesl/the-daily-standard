# Next Steps: Redeploy & Migrate Data

## Step 1: Redeploy on Vercel

You need to trigger a new deployment so Vercel picks up the environment variables:

**Option A: Redeploy from Dashboard (Fastest)**
1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"** tab
3. Click the **"..."** menu (three dots) on the latest deployment
4. Click **"Redeploy"**
5. Wait for deployment to complete (~2-3 minutes)

**Option B: Push a commit (Alternative)**
Just push any small change to trigger a deployment:
```bash
git commit --allow-empty -m "trigger: Redeploy with Supabase env vars"
git push
```

## Step 2: Verify Supabase is Configured

After redeployment completes:
1. Go to your live site: `scdsoctagon.net/admin`
2. Log in
3. Go to **Settings** (bottom of sidebar)
4. Scroll down to **"🚀 Long-Term Solution: Supabase Database"**
5. You should see: **"✅ Supabase is configured!"**

If you see this, you're ready to migrate!

## Step 3: Migrate Your Data

1. In the Settings page, find the green **"Supabase Migration"** section
2. Click the big green button: **"Migrate All Data to Supabase"**
3. Wait for the success message
4. It will show: "Migration complete! X articles and Y authors migrated to Supabase."

## Step 4: Test It Works

1. Create or edit an article
2. Save it
3. The article should now be saved to both localStorage AND Supabase
4. Your data is now persistent across all browsers/devices! 🎉

---

## What Happens After Migration?

- ✅ All your articles are in Supabase database
- ✅ All your authors are in Supabase database
- ✅ New articles automatically sync to Supabase
- ✅ Data persists across browsers/devices
- ✅ No more data loss!

---

**Ready? Start with Step 1 - Redeploy!**
