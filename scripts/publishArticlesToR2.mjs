/**
 * npm run publish:r2
 *
 * Manual equivalent of POST /api/sync-r2.
 * Fetches all published articles from Supabase + seed data from octagonData.json,
 * merges them, and uploads the static JSON files consumed by src/lib/r2Articles.ts:
 *
 *   articles/articles.json          — lightweight list for homepage/section pages
 *   articles/content/{slug}.json    — full article body for article pages
 *
 * Run after any bulk Supabase change. Normal CMS saves still call /api/sync-r2.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const octagonData = JSON.parse(
  readFileSync(join(__dirname, '../src/data/octagonData.json'), 'utf8')
);

function getRequiredEnv() {
  const env = {
    SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET || 'octagon-images',
    R2_S3_ENDPOINT: process.env.R2_S3_ENDPOINT,
  };

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_S3_ENDPOINT) {
    throw new Error('Missing R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_S3_ENDPOINT');
  }

  return env;
}

/** Co-authors kept among a story's internal notes — a copy of the one in api/sync-r2.js. */
function readCoAuthors(notes) {
  if (!Array.isArray(notes)) return [];
  for (const note of notes) {
    try {
      const parsed = JSON.parse(note?.content ?? '');
      if (parsed?.kind !== 'co_authors' || !Array.isArray(parsed.authors)) continue;
      return parsed.authors
        .filter(a => a && typeof a.id === 'string' && a.id && typeof a.name === 'string' && a.name.trim())
        .map(a => ({ id: a.id, name: a.name.trim() }));
    } catch { /* an ordinary note */ }
  }
  return [];
}

function rowToPublic(row) {
  const coAuthors = Array.isArray(row.coAuthors) ? row.coAuthors : readCoAuthors(row.internal_notes);
  return {
    id: String(row.id ?? ''),
    slug: row.slug ?? '',
    headline: row.headline ?? '',
    dek: row.dek ?? '',
    body: row.body ?? '',
    image: row.image ?? '',
    images: row.images ?? [],
    imageCaption: row.image_caption ?? row.imageCaption ?? '',
    section: row.section ?? '',
    author: {
      id: String(row.author?.id ?? row.author_id ?? ''),
      name: row.author?.name ?? row.author_name ?? '',
      role: row.author?.role ?? 'Student Journalist',
      bio: row.author?.bio ?? '',
      image: row.author?.image ?? '',
      email: row.author?.email,
      twitter: row.author?.twitter,
    },
    publishedAt: row.published_at ?? row.publishedAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    readingTime: row.reading_time ?? row.readingTime ?? 1,
    tags: row.tags ?? [],
    featured: row.featured ?? false,
    priority: row.priority ?? 'normal',
    isCinematic: row.is_cinematic ?? row.isCinematic ?? false,
    ...(coAuthors.length ? { coAuthors } : {}),
  };
}

export async function publishArticlesToR2() {
  const env = getRequiredEnv();

  console.log('Fetching published articles from Supabase...');
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('articles')
    .select('id,slug,headline,dek,body,image,images,image_caption,section,author_id,author_name,published_at,updated_at,reading_time,tags,featured,priority,is_cinematic,internal_notes')
    .eq('status', 'published');

  if (error) throw error;

  const supabaseArticles = (data || []).map(rowToPublic);
  console.log(`  ${supabaseArticles.length} articles from Supabase`);

  const seedArticles = (octagonData.articles || []).filter(a => a.slug).map(rowToPublic);
  console.log(`  ${seedArticles.length} articles from octagonData.json`);

  const bySlug = {};
  for (const article of seedArticles) {
    if (article.slug) bySlug[article.slug] = article;
  }
  for (const article of supabaseArticles) {
    if (!article.slug) continue;
    const existing = bySlug[article.slug];
    bySlug[article.slug] = existing && !article.body && existing.body
      ? { ...article, body: existing.body }
      : article;
  }

  const list = Object.values(bySlug)
    .map(({ body: _body, ...rest }) => rest)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  console.log(`  ${list.length} total articles after merge`);

  const s3 = new S3Client({
    region: 'auto',
    endpoint: env.R2_S3_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const uploads = [];
  const listCacheControl = 'public, max-age=60, stale-while-revalidate=300';
  const articleCacheControl = 'public, max-age=3600, stale-while-revalidate=86400';

  console.log('Uploading articles/articles.json...');
  uploads.push(s3.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: 'articles/articles.json',
    Body: JSON.stringify(list),
    ContentType: 'application/json',
    CacheControl: listCacheControl,
  })));

  for (const article of Object.values(bySlug)) {
    if (!article.slug) continue;
    uploads.push(s3.send(new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: `articles/content/${article.slug}.json`,
      Body: JSON.stringify(article),
      ContentType: 'application/json',
      CacheControl: articleCacheControl,
    })));
  }

  await Promise.all(uploads);

  const result = {
    total: list.length,
    supabase: supabaseArticles.length,
    seed: seedArticles.length,
    keys: {
      list: 'articles/articles.json',
      contentPrefix: 'articles/content/',
    },
  };
  console.log(`Done. Synced ${result.total} articles to R2.`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publishArticlesToR2().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
