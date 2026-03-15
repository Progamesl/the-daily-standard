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

### Step 2: How to get files into R2 (upload path)

The browser cannot upload directly to R2 with a normal API key (you don’t want to expose R2 credentials). You need a small “upload gateway”:

**Option A — Cloudflare Worker (recommended)**  
- Create a Worker that:
  - Accepts POST with an image (multipart or base64).
  - Writes to R2 using the Worker’s R2 binding.
  - Returns the public URL of the file (e.g. `https://pub-xxx.r2.dev/octagon-images/abc123.jpg` or your custom domain).
- Restrict who can call it (e.g. your admin only: cookie/session or a secret header).
- In your app, **Story Image** upload: instead of Cloudinary, send the file to this Worker and use the returned URL.

**Option B — Backend on your host**  
- A small API (e.g. Node on Vercel/Netlify) that:
  - Accepts multipart upload.
  - Uses R2’s S3-compatible API (with R2 Access Key + Secret from Cloudflare) to put the file in the bucket.
  - Returns the public URL.
- App uploads to this API; API uploads to R2.

**Option C — Keep using Cloudinary for now**  
- You already have Cloudinary wired. It also keeps images off Supabase. You can switch to R2 later when the Worker (or backend) is ready.

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

If you want, next step can be a **minimal Cloudflare Worker** (code + Wrangler config) that accepts one image upload and writes it to R2, then returns the URL, so you can wire it into the Story Image upload in the app.
