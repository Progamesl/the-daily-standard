# Images and Storage

## Why images blow up storage

**Hundreds of images** in the app are stored in two ways:

1. **URLs** – e.g. `https://octagon.scdsstudent.org/wp-content/uploads/...` or Imgur links. Only the URL text is stored (tiny). The actual image file lives on that server. **No storage cost in your DB.**

2. **Base64 inline** – the image is encoded as text and stored inside the article (`image` / `images` or inside `body`). One photo can be 200 KB–2 MB of text. Hundreds of those = **huge** database size and **huge** egress when that article is loaded.

So the #1 way to reduce storage (and egress) is: **never store base64 images. Use URLs only.**

---

## What we changed in the app

- **ImageUpload** now **defaults to Imgur**: when you paste or drop an image (or browse), it uploads to Imgur and saves the **URL**. That keeps storage and egress low.
- Hold **Ctrl** (or **Cmd**) while pasting/dropping if you really want to save as base64 (not recommended).

---

## Fixing existing base64 images

You already have some articles with base64 in `octagonData.json` (and possibly in Supabase). To fix:

1. **Find them** – Search the repo for `"data:image` or `data:image/png;base64` in article `image` / `images` or in `body`.
2. **Replace with URLs** – For each article:
   - Open the article in the admin editor.
   - If the hero image is base64, use **Upload File** and re-add the image (it will go to Imgur and get a URL), or paste a public image URL.
   - If images are **inside the article body** (e.g. in the HTML), edit the body and replace `<img src="data:image/...">` with `<img src="https://...">` (upload those images to Imgur or your school site and use the URL).
3. **Supabase** – If you migrated articles to Supabase, any with base64 are in the `articles` table. Fix them the same way (edit in admin, re-upload or paste URL), then save. Optionally run a one-time SQL or script to find rows where `image LIKE 'data:%'` or `body LIKE '%data:image%'` to list what needs fixing.

---

## Where should image files live?

- **Imgur** – Free, used by the app when you upload. Good for one-off story images.
- **Your school site** – e.g. `octagon.scdsstudent.org` or `saccdsoctagon.org` (WordPress uploads). Use the public URL in the article.
- **CDN** – If you use Cloudflare in front of your site, image URLs on your domain get cached and reduce load.

Do **not** store the actual image bytes in Supabase (e.g. base64 in `articles`) or in `octagonData.json`. Store only the URL.
