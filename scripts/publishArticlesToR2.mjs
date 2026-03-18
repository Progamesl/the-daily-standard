/**
 * npm run publish:r2
 *
 * Manual equivalent of POST /api/sync-r2.
 * Fetches all published articles from Supabase + seed data from octagonData.json,
 * merges them, and uploads static JSON to R2.
 *
 * Run this:
 *   - Once during initial setup to populate R2
 *   - Any time you want to force a full sync
 *   - After any bulk Supabase change
 *
 * In normal usage, /api/sync-r2 fires automatically after every CMS save.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const octagonData = JSON.parse(
  readFileSync(join(__dirname, '../src/data/octagonData.json'), 'utf8')
);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'octagon-images';
const R2_S3_ENDPOINT = process.env.R2_S3_ENDPOINT;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}
if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ENDPOINT) {
  console.error('Missing R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_S3_ENDPOINT');
  process.exit(1);
}

function rowToPublic(row) {
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
  };
}

async function main() {
  console.log('Fetching published articles from Supabase…');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('articles')
    .select('id,slug,headline,dek,body,image,images,image_caption,section,author_id,author_name,published_at,updated_at,reading_time,tags,featured,priority')
    .eq('status', 'published');

  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }

  const supabaseArticles = (data || []).map(rowToPublic);
  console.log(`  ${supabaseArticles.length} articles from Supabase`);

  const seedArticles = (octagonData.articles || []).filter(a => a.slug).map(rowToPublic);
  console.log(`  ${seedArticles.length} articles from octagonData.json`);

  // Merge: Supabase overrides seed for same slug
  const bySlug = {};
  for (const a of seedArticles) bySlug[a.slug] = a;
  for (const a of supabaseArticles) bySlug[a.slug] = a;

  const list = Object.values(bySlug)
    .map(({ body: _b, ...rest }) => rest)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  console.log(`  ${list.length} total articles after merge`);

  const s3 = new S3Client({
    region: 'auto',
    endpoint: R2_S3_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  const cacheControl = 'public, max-age=30, stale-while-revalidate=60';

  // Keys must match VITE_R2_PUBLIC_BASE_URL which ends with /octagon-images
  // So files live at octagon-images/articles/... inside the bucket
  console.log('Uploading octagon-images/articles/articles.json…');
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: 'octagon-images/articles/articles.json',
    Body: JSON.stringify(list),
    ContentType: 'application/json',
    CacheControl: cacheControl,
  }));

  console.log('Uploading octagon-images/articles/articles-by-slug.json…');
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: 'octagon-images/articles/articles-by-slug.json',
    Body: JSON.stringify(bySlug),
    ContentType: 'application/json',
    CacheControl: cacheControl,
  }));

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
