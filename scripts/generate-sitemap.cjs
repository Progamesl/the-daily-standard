/**
 * Generates public/sitemap.xml from octagonData.json and static routes.
 * Run before build: node scripts/generate-sitemap.cjs
 * Set SITE_URL env (e.g. https://saccdsoctagon.org) or defaults to https://theoctagon.example.com
 */
const fs = require("fs");
const path = require("path");

const SITE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://theoctagon.example.com";
const base = SITE_URL.replace(/\/$/, "");
const now = new Date().toISOString().split("T")[0];

const staticRoutes = [
  "",
  "/about",
  "/contact",
  "/subscribe",
  "/newsletter/preferences",
];

function url(loc) {
  const path = loc.startsWith("/") ? loc : `/${loc}`;
  return `  <url>\n    <loc>${base}${path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === "" ? "1.0" : "0.8"}</priority>\n  </url>`;
}

let urls = staticRoutes.map((r) => url(r));

try {
  const dataPath = path.join(__dirname, "..", "public", "octagonData.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  if (Array.isArray(data.sections)) {
    data.sections.forEach((s) => {
      if (s.slug) urls.push(url(`/section/${s.slug}`));
    });
  }
  if (Array.isArray(data.articles)) {
    data.articles.forEach((a) => {
      if (a.slug) urls.push(url(`/article/${a.slug}`));
    });
  }
  if (Array.isArray(data.authors)) {
    data.authors.forEach((a) => {
      if (a.id) urls.push(url(`/author/${a.id}`));
    });
  }
} catch (e) {
  console.warn("generate-sitemap: could not read octagonData.json", e.message);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

const outPath = path.join(__dirname, "..", "public", "sitemap.xml");
fs.writeFileSync(outPath, sitemap, "utf8");
console.log("Wrote", outPath, "with", urls.length, "URLs. Base:", base);
