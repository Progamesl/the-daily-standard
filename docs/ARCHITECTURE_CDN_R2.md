# Architecture: Cloudflare CDN + Supabase DB + Images on R2

Target stack:

| Layer    | Use                    | Don’t use for images |
|----------|------------------------|------------------------|
| **CDN**  | Cloudflare (site + cache) | —                   |
| **Database** | Supabase (articles, auth, comments) | —              |
| **Images**   | **Cloudflare R2** (or Cloudinary) | **Not Supabase Storage** |

---

## 1. Images must NOT be served from Supabase

- The app **does not use Supabase Storage** anywhere in code. We only use Supabase for:
  - **Database** (articles, authors, comments, etc.)
  - **Auth**
- So by default we are **not** uploading or serving images from Supabase.

If you previously uploaded files to **Supabase Dashboard → Storage** (e.g. a bucket), that is separate from the app and can use a lot of storage/egress. To stop that:

1. Open **Supabase Dashboard → Storage**.
2. If you see buckets with files, either:
   - **Delete the bucket** (or empty it), and stop using Supabase for images, or
   - Migrate those files to R2/Cloudinary and update any article URLs that point to `https://xxx.supabase.co/storage/...`.

The app is already set so that **any image URL containing `supabase.co/storage` is treated as invalid** and will not be used for display. So even if an old article has a Supabase Storage URL, the site won’t serve it (you’ll get placeholder or no image until you replace the URL with an R2/Cloudinary URL).

---

## 2. Target: CDN → Cloudflare, images → R2

- **Cloudflare in front**
  - Put your site behind Cloudflare (DNS → Cloudflare).
  - Caching and Bot Fight Mode help with performance and egress.

- **Database**
  - Keep using **Supabase** for all structured data and auth. No change.

- **Images**
  - Prefer **Cloudflare R2** (S3-compatible, no egress fees):
    - Create an R2 bucket in the Cloudflare dashboard.
    - Upload images via a small backend or a **Cloudflare Worker** that:
      - Accepts uploads (e.g. presigned URL or form POST).
      - Writes to R2 and returns the public (or CDN) URL.
    - Store **only that URL** in Supabase (e.g. `articles.image` or in body).
  - Alternatively you can keep using **Cloudinary** (already wired in the app) until R2 is set up.

So: **CDN = Cloudflare, DB = Supabase, images = R2 (or Cloudinary); images are never served from Supabase Storage.**

---

## 3. Adding R2 uploads to the app (later)

To switch from Cloudinary to R2:

1. Create an R2 bucket and either:
   - Enable **public access** and use a **Custom Domain** (e.g. `images.yoursite.com`) for image URLs, or
   - Use a **Worker** in front of R2 to serve (and optionally to handle uploads).
2. For **upload from the browser** you need one of:
   - A **Worker** that generates presigned PUT URLs; the app uploads the file to that URL, then you save the final R2 URL in the article, or
   - A small **backend** (e.g. Node) that receives the file and uploads to R2, then returns the URL.
3. In the app, add an “upload to R2” path (e.g. call your Worker/backend, get URL, set `article.image` or insert URL in body) and use that instead of (or in addition to) Cloudinary in the Story Image / Insert image flow.

Until R2 upload is implemented, **Cloudinary** remains the supported “images off Supabase” option in the app; R2 can replace it once the upload pipeline is in place.
