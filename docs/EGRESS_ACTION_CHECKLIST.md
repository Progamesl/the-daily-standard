# Egress over 5 GB — What YOU need to do

The **8.7 GB already used won’t go down**. Supabase counts egress in the current billing period. The code changes (15 min cache, list-only fetch, single-article load) only **reduce egress from now on**.

Do these in order:

---

## 1. Deploy the latest code (required)

If your live site isn’t running the code we changed, egress will stay high.

- Commit and push all changes (supabaseDataService, useSupabaseArticles, useArticles, adminDataService, useArticleBySlug, ArticlePage, AdminStoryEditor).
- Rebuild and redeploy wherever the site is hosted (Vercel, Netlify, etc.):
  - **Vercel:** Push to your connected branch or trigger a redeploy in the dashboard.
  - **Netlify:** Same — push or “Trigger deploy” in the dashboard.
  - **Other:** Run `npm run build` and deploy the new `dist/` (or equivalent).

After this, the live app will use the 15 min cache and list-only/single-article fetches, so **new** egress should drop.

---

## 2. When does the egress counter reset?

- In **Supabase Dashboard** go to **Settings → Billing** (or **Usage / Reports**).
- Check when the current period ends (e.g. “Resets on March 20” or “Billing period: 1st–30th”).
- Until then, the **8.7 / 5 GB** number may not change; the project can stay paused (402) until the period resets.
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

The **8.705 / 5 GB** will only go “back to normal” when the period resets. Your job is to deploy the code and (optionally) add Cloudflare so that **after** the reset, egress stays under 5 GB.
