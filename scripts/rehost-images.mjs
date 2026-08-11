/**
 * Rehost every article image on our own R2 storage, properly sized.
 *
 * WHY
 * Article images currently point at the old WordPress site. That causes three
 * separate problems, measured across 352 live images:
 *   - 30% are under 1200px wide, so they turn to mush when a layout stretches
 *     them across a full-width hero.
 *   - 63 files are over 800KB and 45 photos are saved as PNG, which is 3-5x
 *     larger than it needs to be — slow, and often still low resolution.
 *   - 55 URLs no longer resolve at all. Those articles show nothing, and every
 *     remaining link is one WordPress outage away from joining them.
 *
 * WHAT THIS DOES
 * Downloads each distinct image, resizes it down to a sane maximum (never up —
 * upscaling invents nothing and only adds bytes), converts to an efficient
 * format, uploads it to R2, and records the real pixel dimensions so the site
 * can stop blowing small images up past what they can carry.
 *
 *   node scripts/rehost-images.mjs --dry-run     # report only
 *   node scripts/rehost-images.mjs               # do it
 *   node scripts/rehost-images.mjs --limit 20    # try a small batch first
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED = path.join(HERE, '..', 'src', 'data', 'octagonData.json');
const MANIFEST = path.join(HERE, '..', 'src', 'data', 'imageManifest.json');
const SECRETS = path.join(HERE, '..', '.supabase-admin.local');
const UPLOAD = process.env.OCTAGON_UPLOAD_URL || 'https://www.scdsoctagon.net/api/upload-image';

const MAX_WIDTH = 2200;   // plenty for a full-bleed hero on a retina display
const JPEG_QUALITY = 86;
const CONCURRENCY = 6;

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i !== -1) out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = loadEnvFile(SECRETS);
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const ref = serviceKey
  ? JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8')).ref
  : null;
const supaUrl = ref ? `https://${ref}.supabase.co` : null;
const svc = serviceKey
  ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  : null;

// ── Gather every image reference ────────────────────────────────────────────
const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const seedArticles = seed.articles || [];

let supaArticles = [];
if (svc) {
  const r = await fetch(`${supaUrl}/rest/v1/articles?select=id,slug,image,images&limit=2000`, { headers: svc });
  if (r.ok) supaArticles = await r.json();
}

const isRemote = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const alreadyOurs = (u) => typeof u === 'string' && u.includes('.r2.dev');

const urls = new Set();
const collect = (a) => {
  if (isRemote(a.image) && !alreadyOurs(a.image)) urls.add(a.image);
  (Array.isArray(a.images) ? a.images : []).forEach((i) => {
    if (isRemote(i) && !alreadyOurs(i)) urls.add(i);
  });
};
seedArticles.forEach(collect);
supaArticles.forEach(collect);

const targets = [...urls].slice(0, LIMIT);
console.log(`seed articles      : ${seedArticles.length}`);
console.log(`supabase articles  : ${supaArticles.length}`);
console.log(`distinct off-site images: ${urls.size}${targets.length < urls.size ? ` (processing ${targets.length})` : ''}`);
console.log(`mode               : ${dryRun ? 'DRY RUN — nothing uploaded or written' : 'live'}\n`);

// ── Fetch, optimise, upload ─────────────────────────────────────────────────
const mapping = {};   // originalUrl -> { url, width, height }
const dead = [];
const failed = [];
let done = 0;
let bytesBefore = 0;
let bytesAfter = 0;

async function uploadBuffer(buf, contentType) {
  const res = await fetch(UPLOAD, { method: 'POST', headers: { 'Content-Type': contentType }, body: buf });
  const text = await res.text();
  if (!res.ok) throw new Error(`upload ${res.status}: ${text.slice(0, 120)}`);
  const json = JSON.parse(text);
  const url = json.url || json.link || json.data?.link;
  if (!url) throw new Error(`no url in response: ${text.slice(0, 120)}`);
  return url;
}

async function processOne(src) {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) { dead.push({ src, reason: `HTTP ${res.status}` }); return; }
    const input = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) { failed.push({ src, reason: 'unreadable image' }); return; }

    // Transparency must survive; everything else becomes JPEG.
    const keepAlpha = meta.hasAlpha && meta.format === 'png';
    let pipeline = sharp(input).rotate(); // honour EXIF orientation
    if (meta.width > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }
    const output = keepAlpha
      ? await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();

    const finalMeta = await sharp(output).metadata();
    bytesBefore += input.length;
    bytesAfter += output.length;

    if (dryRun) {
      mapping[src] = { url: '(dry-run)', width: finalMeta.width, height: finalMeta.height };
    } else {
      const url = await uploadBuffer(output, keepAlpha ? 'image/png' : 'image/jpeg');
      mapping[src] = { url, width: finalMeta.width, height: finalMeta.height };
    }
  } catch (e) {
    const msg = String(e.message || e);
    if (/timeout|ENOTFOUND|ECONNREFUSED|certificate|fetch failed/i.test(msg)) dead.push({ src, reason: msg.slice(0, 60) });
    else failed.push({ src, reason: msg.slice(0, 80) });
  } finally {
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${targets.length}…`);
  }
}

const queue = [...targets];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await processOne(queue.shift());
}));

// ── Rewrite references ──────────────────────────────────────────────────────
const remap = (u) => (mapping[u]?.url && mapping[u].url !== '(dry-run)' ? mapping[u].url : u);

let seedChanged = 0;
seedArticles.forEach((a) => {
  if (mapping[a.image]) { a.image = remap(a.image); seedChanged++; }
  if (Array.isArray(a.images)) a.images = a.images.map(remap);
});

if (!dryRun) {
  fs.writeFileSync(SEED, JSON.stringify(seed));
  console.log(`\nseed updated: ${seedChanged} hero images repointed`);

  // Dimensions the site can consult before deciding how big to render something.
  const dims = {};
  for (const [, v] of Object.entries(mapping)) {
    if (v.url && v.url !== '(dry-run)') dims[v.url] = { w: v.width, h: v.height };
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(dims, null, 0));
  console.log(`dimension manifest: ${Object.keys(dims).length} entries -> src/data/imageManifest.json`);

  // Supabase rows
  let supaChanged = 0;
  for (const a of supaArticles) {
    const next = remap(a.image);
    const nextImages = Array.isArray(a.images) ? a.images.map(remap) : a.images;
    if (next !== a.image || JSON.stringify(nextImages) !== JSON.stringify(a.images)) {
      const r = await fetch(`${supaUrl}/rest/v1/articles?id=eq.${encodeURIComponent(a.id)}`, {
        method: 'PATCH', headers: svc, body: JSON.stringify({ image: next, images: nextImages }),
      });
      if (r.ok) supaChanged++;
    }
  }
  console.log(`supabase rows updated: ${supaChanged}`);
}

// ── Report ──────────────────────────────────────────────────────────────────
const ok = Object.keys(mapping).length;
console.log(`\n${'═'.repeat(58)}`);
console.log(`rehosted        : ${ok}`);
console.log(`dead / gone     : ${dead.length}`);
console.log(`failed          : ${failed.length}`);
if (bytesBefore) {
  console.log(`size            : ${(bytesBefore / 1048576).toFixed(1)} MB -> ${(bytesAfter / 1048576).toFixed(1)} MB ` +
    `(${Math.round((1 - bytesAfter / bytesBefore) * 100)}% smaller)`);
}
if (dead.length) {
  console.log(`\ndead images (article will have no picture until replaced):`);
  dead.slice(0, 15).forEach((d) => console.log(`  ${d.reason.padEnd(22)} ${d.src.slice(0, 84)}`));
  if (dead.length > 15) console.log(`  …and ${dead.length - 15} more`);
}
if (failed.length) {
  console.log(`\nfailed:`);
  failed.slice(0, 10).forEach((f) => console.log(`  ${f.reason.padEnd(30)} ${f.src.slice(0, 70)}`));
}
fs.writeFileSync(path.join(HERE, '..', 'image-rehost-report.json'),
  JSON.stringify({ mapping, dead, failed }, null, 1));
console.log(`\nfull report: image-rehost-report.json`);
