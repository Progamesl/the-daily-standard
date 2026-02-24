/**
 * For each article in octagonData.json, set image and images from the first
 * <img src="..."> in the article body so each story has its own image
 * (avoids duplicate-URL placeholder on the homepage).
 * Run: node scripts/set-story-images-from-body.cjs
 */
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "src", "data", "octagonData.json");
const PUBLIC_PATH = path.join(__dirname, "..", "public", "octagonData.json");

function isPlaceholderOrFake(url) {
  if (!url || typeof url !== "string" || url.length < 10) return true;
  const u = url.toLowerCase();
  return (
    u.includes("placeholder") ||
    u.includes("wayback") ||
    u.includes("archive.org") ||
    u.includes("thekeyworldwide.com") ||
    u.includes("world business")
  );
}

/** Extract first img src from HTML body. Returns null if none or invalid. */
function firstImageFromBody(body) {
  if (!body || typeof body !== "string") return null;
  const match = body.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match) return null;
  const url = match[1].trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  if (isPlaceholderOrFake(url)) return null;
  return url;
}

function run() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  if (!Array.isArray(data.articles)) {
    console.error("No data.articles array");
    process.exit(1);
  }

  let updated = 0;
  let fromBody = 0;
  for (const article of data.articles) {
    const fromHtml = firstImageFromBody(article.body);
    if (fromHtml) {
      const prev = article.image;
      article.image = fromHtml;
      if (Array.isArray(article.images)) {
        if (!article.images.includes(fromHtml)) {
          article.images = [fromHtml, ...article.images.filter((u) => u !== fromHtml)];
        }
      } else {
        article.images = [fromHtml];
      }
      updated++;
      fromBody++;
      if (prev !== fromHtml) {
        console.log(`  ${article.id} "${(article.headline || "").slice(0, 50)}..." -> body image`);
      }
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
  console.log(`Updated ${updated} articles (${fromBody} from body). Wrote ${DATA_PATH}`);

  if (fs.existsSync(PUBLIC_PATH)) {
    fs.writeFileSync(PUBLIC_PATH, JSON.stringify(data, null, 2), "utf8");
    console.log("Also wrote public/octagonData.json");
  }
}

run();
