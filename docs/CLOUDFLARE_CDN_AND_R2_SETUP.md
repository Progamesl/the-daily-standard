# Cloudflare CDN + R2 for images — setup and will it fix egress?

## Will this solve our egress issue?

**Short answer:**  
- **R2 for images:** Yes — it keeps image bytes off Supabase. Right now we already avoid Supabase Storage (blocked in app + you shouldn’t use it). Putting new uploads on R2 (or Cloudinary) means **zero** image egress from Supabase.  
- **Cloudflare CDN in front of the site:** Helps a lot with speed and abuse, but **does not** reduce Supabase egress by itself. API calls (article list, article body) still go **browser → Supabase**. Cloudflare caches your **HTML/JS/CSS** (the app shell), not those API responses. So:
  - **What actually cuts Supabase egress:** list-only fetch, 1 hr cache, single-article fetch, no base64, no images from Supabase (we did that).
  - **What CDN + R2 add:** Images and app assets served from Cloudflare/R2 instead of anywhere else; fewer bots and faster load. So: **R2 for images = good and “solves” the image part. CDN = good for the rest of the site; egress is already addressed by the app changes.**

---

## Part 1: Cloudflare as CDN (in front of your site)

1. **Sign up:** [dash.cloudflare.com](https://dash.cloudflare.com) → Add a site → enter your domain (e.g. `thedailystandard.com`).
2. **Change nameservers:** Cloudflare will show two nameservers (e.g. `ns1.cloudflare.com`, `ns2.cloudflare.com`). At your **domain registrar** (where you bought the domain), set the domain’s nameservers to those. Save.
3. **Wait for DNS to propagate** (often 5–30 min). Cloudflare will show “Active” when it’s proxying.
4. **Origin:** In Cloudflare **Rules** or **DNS**, your A/CNAME records should point to your **host** (Vercel/Netlify). So: **Visitor → Cloudflare (CDN) → Your host.** Your host keeps serving the app; Cloudflare caches what it can (HTML, JS, CSS).
5. **Optional:** **Caching → Configuration** → Caching level **Standard**. **Security → Bots** → **Bot Fight Mode** on to cut bot traffic.

Result: Your site is behind Cloudflare. Static assets get cached; Supabase API calls still go straight from the browser to Supabase (no change to egress for those).

---

## Part 2: Images (and optional assets) on Cloudflare R2

R2 = object storage (like S3), no egress fees. Use it for **uploaded images** (story images). Optionally for other assets.

### Step 1: Create an R2 bucket

1. In **Cloudflare Dashboard** → **R2** → **Create bucket**.
2. Name it (e.g. `octagon-images`). Create.
3. **Settings** for that bucket:
   - Either **Public access** (so you get URLs like `https://pub-xxx.r2.dev/octagon-images/...`)  
   - Or **Custom domain** (e.g. `images.yoursite.com`) so URLs are on your domain.  
   You need at least one of these so the app can use image URLs.

### Step 2: Deploy the upload Worker (included in this repo)

The project includes a Worker in `cloudflare-worker-r2-upload/` that accepts image uploads and stores them in R2.

1. **Enable public access on the bucket** (if you haven’t):
   - R2 → your bucket (`octagon-images`) → **Settings** → **Public access** → **Allow Access**.
   - Note the **Bucket URL** (e.g. `https://pub-xxxxxxxx.r2.dev/octagon-images`). No trailing slash.

2. **Edit `cloudflare-worker-r2-upload/wrangler.toml`**:
   - Set `bucket_name` under `r2_buckets` to your bucket name (e.g. `octagon-images`).
   - Set `R2_PUBLIC_BASE_URL` in `[vars]` to the bucket URL from step 1 (e.g. `https://pub-xxxxxxxx.r2.dev/octagon-images`).

3. **Deploy the Worker** — Wrangler must run from a directory that does *not* contain the main app’s `node_modules`, or you’ll get “Asset too large”. Easiest: copy only the Worker files to a temp dir and deploy from there:
   ```bash
   cd /tmp && rm -rf r2-deploy && mkdir r2-deploy
   cp /path/to/the-daily-standard/cloudflare-worker-r2-upload/worker.js /path/to/the-daily-standard/cloudflare-worker-r2-upload/wrangler.toml r2-deploy/
   cd r2-deploy && npx wrangler deploy
   ```
   (Replace `/path/to/the-daily-standard` with your repo path, e.g. `~/OCTAGON/the-daily-standard`.)
   - If Wrangler says you need to register a workers.dev subdomain, open the link it gives (e.g. **Workers & Pages** → **Overview** → set up subdomain), then run `npx wrangler deploy` again.
   - After deploy, Wrangler prints the Worker URL (e.g. `https://octagon-r2-upload.<your-subdomain>.workers.dev`).

4. **Optional — restrict uploads with a secret**:
   ```bash
   npx wrangler secret put R2_SECRET
   ```
   Enter a strong random string. The app will send this in the `X-R2-Secret` header; without it, anyone could upload to your bucket if they know the Worker URL.

5. **Configure the app**:
   - In your app’s `.env` (or Vercel env vars), set:
     - `VITE_R2_UPLOAD_URL` = the Worker URL from step 3 (e.g. `https://octagon-r2-upload.<subdomain>.workers.dev`).
     - `VITE_R2_SECRET` = the same value you set in `R2_SECRET` (only if you set the secret in step 4).
   - Rebuild/redeploy the app. Story image uploads in the admin will then go to R2 first (before Cloudinary or Imgur).

Result: When editors upload a story image in the admin, the file is sent to the Worker, stored in R2, and the public image URL is saved. No Supabase egress for images.

### Step 3: Use R2 URLs in the app

- Wherever you store the “story image” URL (Supabase `articles.image`, etc.), store the **R2 (or custom domain) URL**.
- The app already renders `<img src={article.image} />`, so no change needed once the URL is an R2 URL.
- **No images from Supabase Storage** — we already block those. So yes: **all images and (if you put them there) assets from R2 + CDN = no image egress from Supabase.**

---

## Part 3: “All assets” to R2?

- **App assets (JS/CSS from Vite build):** Usually you keep these on your host (Vercel/Netlify). Cloudflare in front will cache them. You *could* put them on R2 and point your HTML to those URLs, but it’s optional and more moving parts.
- **Images (uploads):** Put these on R2 (via Worker or backend) and store only URLs in Supabase. This is what “all images to R2” means and it **does** help (images never touch Supabase).

---

## Summary

| Goal | What to do | Does it fix egress? |
|------|------------|----------------------|
| CDN = Cloudflare | Add site in Cloudflare, point nameservers, origin = your host | Caches app/assets; doesn’t reduce Supabase API egress by itself |
| Images (and assets) on R2 | Create R2 bucket, add Worker (or backend) to upload, store R2 URLs in DB | Yes — no image egress from Supabase; images served from R2 |
| Egress already reduced in app | List-only, 1 hr cache, single-article fetch, no base64, no Supabase Storage | Yes — this is what actually cuts Supabase egress |

So: **Use Cloudflare as CDN** (Part 1). **Put images on R2** (Part 2) via a Worker or backend and use those URLs everywhere. That, plus the app changes we made, **does** solve the issue: Supabase egress stays low (only API JSON), and images/assets are served from Cloudflare/R2.

---

## Troubleshooting: ERR_QUIC_PROTOCOL_ERROR (“This site can’t be reached”)

If you see this even after turning off **HTTP/3 (with QUIC)** in Cloudflare (**Network**), the browser may still be trying QUIC. Try these in order:

### 1. Disable QUIC in Chrome (most likely fix)

- In the address bar go to: `chrome://flags/#enable-quic`
- Set **Experimental QUIC protocol** to **Disabled**
- Click **Relaunch**
- Try https://scdsoctagon.net/admin again

### 2. Clear site data and retry

- Chrome: **Settings → Privacy and security → Clear browsing data** → time range **Last hour** (or **All time**) → check **Cached images and files** and **Cookies and other site data** → **Clear data**
- Or for just this site: open DevTools (F12) → **Application** tab → **Storage** → **Clear site data**
- Try the URL again in a new tab

### 3. Try another browser or incognito

- Try **Firefox** or **Safari** (they don’t always use QUIC the same way), or Chrome **Incognito** (Ctrl/Cmd+Shift+N). If it works there, the issue is Chrome + QUIC on your machine.

### 4. Bypass Cloudflare temporarily (confirm origin works)

- In Cloudflare **DNS** for scdsoctagon.net, find the **A** or **CNAME** record for `@` (and `www` if you use it).
- Click the **orange cloud** so it turns **grey** (DNS only — traffic goes straight to your host, not through Cloudflare).
- Wait 1–2 minutes, then try https://scdsoctagon.net/admin (or http:// first).
- If it **works** with grey cloud: the problem is between the browser and Cloudflare (QUIC/proxy). Keep QUIC off and use step 1 (disable QUIC in Chrome) so you can turn the orange cloud back on.
- If it **still fails** with grey cloud: the problem may be your host (Vercel/Netlify) or DNS (wrong A/CNAME). Check the host dashboard and that the domain is correctly pointed to the deployed app.

### 5. Check SSL in Cloudflare

- **SSL/TLS** → **Overview**: encryption mode should be **Full** or **Full (strict)**, not **Off** or **Flexible** (unless your origin has no HTTPS).
