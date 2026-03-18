/**
 * POST /api/sync-r2
 *
 * Fetches all published articles from Supabase (+ seed data from octagonData.json),
 * merges them, then uploads two static JSON files to Cloudflare R2:
 *
 *   articles/articles.json        — lightweight list (no body) for homepage/section pages
 *   articles/articles-by-slug.json — full articles with body for article pages
 *
 * The public site reads from R2 (zero Supabase egress, free Cloudflare CDN egress).
 * Called automatically from the CMS after every article save.
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let octagonData;
try {
  const raw = readFileSync(join(__dirname, '../src/data/octagonData.json'), 'utf8');
  octagonData = JSON.parse(raw);
} catch {
  octagonData = { articles: [], authors: [], sections: [] };
}

const {
  VITE_SUPABASE_URL: SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET = 'octagon-images',
  R2_S3_ENDPOINT,
} = process.env;

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase not configured (missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)' });
  }
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ENDPOINT) {
    return res.status(500).json({ error: 'R2 not configured (missing R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_S3_ENDPOINT)' });
  }

  try {
    // 1. Fetch published articles from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('articles')
      .select('id,slug,headline,dek,body,image,images,image_caption,section,author_id,author_name,published_at,updated_at,reading_time,tags,featured,priority')
      .eq('status', 'published');

    if (error) throw error;

    const supabaseArticles = (data || []).map(rowToPublic);

    // 2. Load seed articles from octagonData.json (WordPress export / historical articles)
    const seedArticles = (octagonData.articles || [])
      .filter(a => a.slug)
      .map(rowToPublic);

    // 3. Merge: Supabase overrides seed for same slug
    const bySlug = {};
    for (const a of seedArticles) bySlug[a.slug] = a;
    for (const a of supabaseArticles) bySlug[a.slug] = a;

    // 4. Build list (no body) sorted newest first
    const list = Object.values(bySlug)
      .map(({ body: _b, ...rest }) => rest)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // 5. Upload to R2
    const s3 = new S3Client({
      region: 'auto',
      endpoint: R2_S3_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    // Keys must match VITE_R2_PUBLIC_BASE_URL which ends with /octagon-images
    // So files live at octagon-images/articles/... inside the bucket
    const cacheControl = 'public, max-age=30, stale-while-revalidate=60';
    await Promise.all([
      s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: 'octagon-images/articles/articles.json',
        Body: JSON.stringify(list),
        ContentType: 'application/json',
        CacheControl: cacheControl,
      })),
      s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: 'octagon-images/articles/articles-by-slug.json',
        Body: JSON.stringify(bySlug),
        ContentType: 'application/json',
        CacheControl: cacheControl,
      })),
    ]);

    console.log(`[sync-r2] Synced ${list.length} articles (${supabaseArticles.length} Supabase + ${seedArticles.length} seed) to R2`);
    return res.status(200).json({
      ok: true,
      total: list.length,
      supabase: supabaseArticles.length,
      seed: seedArticles.length,
    });
  } catch (err) {
    console.error('[sync-r2] Error:', err);
    return res.status(500).json({ error: err?.message || 'Sync failed' });
  }
}
