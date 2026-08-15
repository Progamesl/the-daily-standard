/**
 * Generates public/sitemap.xml.
 *
 * Runs before every build (see the "prebuild" script), so the sitemap ships
 * with whatever is published at deploy time.
 *
 * The article list comes from R2 — the same copy the site serves readers —
 * rather than the bundled octagonData.json seed, which only holds the old
 * WordPress export and misses everything published since. If R2 can't be
 * reached the seed is used instead, so a build never fails over a sitemap.
 *
 *   node scripts/generate-sitemap.cjs
 */
const fs = require("fs");
const path = require("path");

const SITE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.scdsoctagon.net";
const R2 = process.env.VITE_R2_PUBLIC_URL || "https://pub-cc09e9eb3d7d4e83b7fb733e08d877bb.r2.dev";
const base = SITE_URL.replace(/\/$/, "");
const today = new Date().toISOString().split("T")[0];

// The sections the paper actually runs. The sitemap this replaces advertised
// world, politics, business, technology, science and health — none of which
// exist here — so crawlers were being sent to empty pages.
const SECTIONS = ["us", "arts", "opinion", "sports", "features", "editorial"];

const STATIC_ROUTES = ["", "/about", "/contact", "/subscribe", "/staff", "/advertise"];

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function url(loc, lastmod, priority, changefreq) {
  return (
    `  <url>\n    <loc>${esc(base + loc)}</loc>\n` +
    `    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>${changefreq}</changefreq>\n` +
    `    <priority>${priority}</priority>\n  </url>`
  );
}

async function loadArticles() {
  try {
    const res = await fetch(`${R2}/articles/articles.json`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.articles || [];
    if (!list.length) throw new Error("empty list");
    return { list, from: "R2" };
  } catch (e) {
    console.warn(`  sitemap: R2 unavailable (${e.message}); falling back to the bundled seed`);
    try {
      const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "octagonData.json"), "utf8"));
      return { list: seed.articles || [], from: "seed" };
    } catch {
      return { list: [], from: "nothing" };
    }
  }
}

(async () => {
  const { list, from } = await loadArticles();

  const seen = new Set();
  const urls = [
    ...STATIC_ROUTES.map((r) => url(r || "/", today, r ? "0.6" : "1.0", "daily")),
    ...SECTIONS.map((s) => url(`/section/${s}`, today, "0.8", "daily")),
  ];

  for (const a of list) {
    if (!a || !a.slug || seen.has(a.slug)) continue;
    seen.add(a.slug);
    const d = a.publishedAt || a.published_at;
    const day = d && !Number.isNaN(new Date(d).getTime()) ? new Date(d).toISOString().split("T")[0] : today;
    urls.push(url(`/article/${a.slug}`, day, "0.7", "monthly"));
  }

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  const outPath = path.join(__dirname, "..", "public", "sitemap.xml");
  fs.writeFileSync(outPath, sitemap, "utf8");
  console.log(`  sitemap: ${urls.length} urls at ${base} (${seen.size} articles from ${from})`);
})();
