# Egress over 5 GB — What YOU need to do

The **11 GB (or whatever you’re at) already used won’t go down** until the billing period resets. Supabase counts egress in the current period. Code changes only **reduce egress from now on**.

Do these in order:

---

## 1. Deploy the latest code (required)

If your live site isn’t running the latest code, egress will stay high.

- Commit and push **all** recent changes (list-only fetch, 1 hr cache, single-article load, no base64 in body, Cloudinary/R2 for images, no Supabase Storage image URLs).
- **Rebuild and redeploy** on your host (Vercel, Netlify, etc.):
  - **Vercel:** Push to connected branch or “Redeploy” in dashboard.
  - **Netlify:** “Trigger deploy” in dashboard.
  - **Other:** `npm run build` and deploy the new `dist/`.

The app now uses: **1 hr cache**, **list without body/images array**, **one full article only when viewing it**, **no base64 in body**, **images via URL only**. New egress should drop a lot after deploy.

---

## 2. When does the egress counter reset?

- In **Supabase Dashboard** go to **Settings → Billing** (or **Usage / Reports**).
- Check when the current period ends (e.g. “Resets on March 20” or “Billing period: 1st–30th”).
- Until then, the usage number may not change; the project can stay paused (402) until the period resets.
- **After reset** the counter goes back to 0 and, with the new code, you should stay under 5 GB if traffic is normal.

---

## 3. Put Cloudflare in front (optional)

Your app is a **client-side SPA**: the browser loads HTML/JS, then JS calls **Supabase directly**. So Supabase egress is mostly from those API calls. Cloudflare **cannot cache Supabase API responses** (they’re from the browser to Supabase). So:

- **Biggest lever for Supabase egress:** Deploy the new code (15 min cache, list-only, single-article fetch). That’s step 1.
- **Cloudflare** still helps: it caches your **static files** (HTML, JS, CSS) so users don’t re-download the app from your host every time. You can also use **Bot Fight Mode** (free) to throttle bad bots so they don’t hammer your site (and thus Supabase) as much.

Steps if you want Cloudflare:

1. Sign up at [cloudflare.com](https://www.cloudflare.com) and add your domain.
2. At your domain registrar, set **nameservers** to the ones Cloudflare gives you.
3. In Cloudflare: **Caching → Configuration** set Caching Level to **Standard**, and **Security → Bots** turn on **Bot Fight Mode**.
4. Your host (Vercel/Netlify etc.) stays as the origin; Cloudflare sits in front.

This reduces load on your host and can reduce some traffic from bots. It does **not** cache Supabase API traffic; that’s why deploying the new code is mandatory.

---

## 4. If the project is already paused (402)

- You can’t “undo” the 8.7 GB already used.
- Either wait for the **billing period to reset** (step 2), or contact Supabase support and ask if they can reset the usage / give a one-time waiver (no guarantee).
- After reset, with the new code deployed and (optionally) Cloudflare in front, you should stay under 5 GB.

---

## Summary

| Action | You do it |
|--------|-----------|
| Deploy latest code | Push + rebuild + redeploy on your host |
| Check reset date | Supabase Dashboard → Billing / Usage |
| Add Cloudflare | Sign up, add site, change nameservers, set cache TTL |
| Wait for reset | Nothing; counter resets at period end |

Usage will only go back to 0 when the period resets. Your job is to deploy the code and (optionally) add Cloudflare so that **after** the reset, egress stays under 5 GB.

---

## 5. Emergency: still over after deploy?

- **No images from Supabase Storage** — App already ignores any `supabase.co/storage` image URL. In Supabase Dashboard → Storage, empty or delete buckets so nothing is served from there.
- **No base64 in articles** — Edit any article that might have pasted-in images in the body; re-save so body is stripped of base64. Use Story Image (Cloudinary/R2 URL) and “Insert image” with URLs only.
- **Cloudflare + Bot Fight Mode** — Reduces bot traffic so fewer requests hit Supabase.
- **Realtime** — Comments and breaking news use Supabase Realtime. If you can live without live updates, we can switch those to polling or disable to cut Realtime egress.
