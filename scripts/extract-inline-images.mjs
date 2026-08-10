/**
 * Move base64 images out of the bundled seed data and onto R2.
 *
 * `src/data/octagonData.json` is statically imported, so Vite inlines all of it
 * into the JS bundle every reader downloads. A handful of articles carry their
 * hero image as a base64 data: URI — and store the same blob twice (once in
 * `image`, once in `images[]`). Three articles alone accounted for ~3.7 MB of an
 * 8 MB bundle.
 *
 * This uploads each distinct image once, rewrites the references to the R2 URL,
 * and de-duplicates `images[]` against `image`.
 *
 *   node scripts/extract-inline-images.mjs --dry-run
 *   node scripts/extract-inline-images.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'src', 'data', 'octagonData.json');
const UPLOAD_ENDPOINT =
  process.env.OCTAGON_UPLOAD_URL || 'https://www.scdsoctagon.net/api/upload-image';

const dryRun = process.argv.includes('--dry-run');

const raw = fs.readFileSync(DATA, 'utf8');
const before = Buffer.byteLength(raw, 'utf8');
const data = JSON.parse(raw);

const isData = (v) => typeof v === 'string' && v.startsWith('data:');

/** data:image/png;base64,AAA… → { mime, buffer } */
function decodeDataUri(uri) {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(uri);
  if (!m) return null;
  const [, mime, isB64, payload] = m;
  return {
    mime: mime || 'application/octet-stream',
    buffer: isB64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8'),
  };
}

async function upload(buffer, mime) {
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': mime },
    body: buffer,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`upload failed (${res.status}): ${text.slice(0, 200)}`);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`upload returned non-JSON: ${text.slice(0, 200)}`);
  }
  const url = json.url || json.link || json.data?.link;
  if (!url) throw new Error(`upload returned no url: ${text.slice(0, 200)}`);
  return url;
}

// ── Collect distinct data: URIs ─────────────────────────────────────────────
const uriToArticles = new Map();
for (const a of data.articles || []) {
  const seen = new Set();
  if (isData(a.image)) seen.add(a.image);
  if (Array.isArray(a.images)) a.images.forEach((i) => isData(i) && seen.add(i));
  for (const uri of seen) {
    if (!uriToArticles.has(uri)) uriToArticles.set(uri, []);
    uriToArticles.get(uri).push(a.slug);
  }
}

console.log(`file            : ${(before / 1048576).toFixed(2)} MB`);
console.log(`distinct inline images: ${uriToArticles.size}`);
for (const [uri, slugs] of uriToArticles) {
  console.log(`  ${(Buffer.byteLength(uri, 'utf8') / 1024).toFixed(0).padStart(5)} KB  ${slugs.join(', ')}`);
}

if (uriToArticles.size === 0) {
  console.log('\nNothing to extract.');
  process.exit(0);
}

// ── Upload each distinct image once ─────────────────────────────────────────
const replacement = new Map();
if (!dryRun) {
  console.log('\nuploading…');
  for (const [uri] of uriToArticles) {
    const decoded = decodeDataUri(uri);
    if (!decoded) {
      console.log('  ! could not decode one image — leaving it as-is');
      continue;
    }
    try {
      const url = await upload(decoded.buffer, decoded.mime);
      replacement.set(uri, url);
      console.log(`  ok  ${(decoded.buffer.length / 1024).toFixed(0)} KB -> ${url}`);
    } catch (e) {
      console.log(`  !! ${e.message}`);
    }
  }
  if (replacement.size === 0) {
    console.error('\nNo images uploaded — file left untouched.');
    process.exit(1);
  }
}

// ── Rewrite references + de-duplicate images[] ──────────────────────────────
let rewritten = 0;
let deduped = 0;
for (const a of data.articles || []) {
  if (isData(a.image) && replacement.has(a.image)) {
    a.image = replacement.get(a.image);
    rewritten += 1;
  }
  if (Array.isArray(a.images)) {
    a.images = a.images.map((i) => (isData(i) && replacement.has(i) ? replacement.get(i) : i));
    // Drop entries that merely repeat the hero image, and any duplicates.
    const out = [];
    for (const i of a.images) {
      if (i === a.image) { deduped += 1; continue; }
      if (out.includes(i)) { deduped += 1; continue; }
      out.push(i);
    }
    a.images = out;
  }
}

const next = JSON.stringify(data);
const after = Buffer.byteLength(next, 'utf8');

console.log(`\nhero images rewritten : ${rewritten}`);
console.log(`duplicate entries removed : ${deduped}`);
console.log(`size ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB  (saves ${((before - after) / 1048576).toFixed(2)} MB)`);

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  process.exit(0);
}

fs.writeFileSync(DATA, next);
console.log('\nWrote src/data/octagonData.json');
