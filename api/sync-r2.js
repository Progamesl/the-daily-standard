/**
 * POST /api/sync-r2
 *
 * Fetches all published articles from Supabase (+ seed data from octagonData.json),
 * merges them, then uploads two static JSON files to Cloudflare R2:
 *
 *   articles/articles.json          — lightweight list (no body) for homepage/section pages
 *   articles/content/{slug}.json    — full article body for article pages
 *
 * The public site reads from R2 (zero Supabase egress, free Cloudflare CDN egress).
 * Called automatically from the CMS after every article save.
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
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
  SUPABASE_SERVICE_ROLE_KEY,
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
    isCinematic: row.is_cinematic ?? row.isCinematic ?? false,
    // Narration recorded ahead of time, if this story has any.
    audioUrl: row.audio_url ?? row.audioUrl ?? '',
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
      .select('id,slug,headline,dek,body,image,images,image_caption,section,author_id,author_name,published_at,updated_at,reading_time,tags,featured,priority,is_cinematic,audio_url')
      .eq('status', 'published');

    if (error) throw error;

    const supabaseArticles = (data || []).map(rowToPublic);

    // 1b. Slugs the newsroom has taken down.
    //
    // Most of the archive exists only in octagonData.json, and the seed layer
    // below adds all of it unconditionally. So unpublishing or deleting one of
    // those historical stories did nothing at all — it reappeared on the next
    // sync, straight out of the file. That matters: student papers get asked to
    // take old stories down about real people, and the CMS reported success
    // while the story stayed up.
    //
    // Any slug that has a row in the database whose status is not 'published'
    // has been deliberately taken off the site, so the seed copy is skipped.
    //
    // This has to run with the service-role key. Everything else here uses the
    // anonymous key, which row-level security restricts to published rows —
    // exactly the rows this query is trying to exclude — so with the anon key
    // it silently returns nothing and the withholding never happens.
    const withheld = new Set();
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: withheldRows, error: withheldError } = await admin
        .from('articles')
        .select('slug')
        .neq('status', 'published');
      if (withheldError) throw withheldError;
      for (const r of withheldRows || []) if (r.slug) withheld.add(r.slug);
    } else {
      console.warn('[sync-r2] No SUPABASE_SERVICE_ROLE_KEY — cannot withhold seed stories that were taken down.');
    }

    // 2. Load seed articles from octagonData.json (WordPress export / historical articles)
    const seedArticles = (octagonData.articles || [])
      .filter(a => a.slug && !withheld.has(a.slug))
      .map(rowToPublic);

    // 3. Merge: Supabase overrides seed for same slug, but preserve body if new one is empty
    const bySlug = {};
    for (const a of seedArticles) {
      if (a.slug) bySlug[a.slug] = a;
    }
    for (const a of supabaseArticles) {
      if (!a.slug) continue;
      const existing = bySlug[a.slug];
      if (existing && !a.body && existing.body) {
        bySlug[a.slug] = { ...a, body: existing.body };
      } else {
        bySlug[a.slug] = a;
      }
    }

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
    const uploads = [];

    // A. Upload the lightweight list - Short cache for the list to ensure updates appear quickly
    uploads.push(s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: 'articles/articles.json',
      Body: JSON.stringify(list),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=60, stale-while-revalidate=300', 
    })));

    const articleCacheControl = 'public, max-age=3600, stale-while-revalidate=86400';

    // B. Upload individual article files (THE CORE OPTIMIZATION)
    // This allows the frontend to fetch only the data for the specific story being read.
    for (const article of Object.values(bySlug)) {
      if (!article.slug) continue;
      uploads.push(s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `articles/content/${article.slug}.json`,
        Body: JSON.stringify(article),
        ContentType: 'application/json',
        CacheControl: articleCacheControl,
      })));
    }

    // Wait for all uploads to complete
    await Promise.all(uploads);

    // C. Take down stories that are no longer published.
    //
    // Rewriting the list is not enough. Every article also lives at
    // articles/content/{slug}.json, which the article page fetches directly by
    // slug — so an unpublished or deleted story stayed readable at its own URL
    // forever, to anyone holding the link or finding it through a search
    // engine. Anything under that prefix that isn't in this run's published set
    // is removed.
    const shouldExist = new Set(
      Object.values(bySlug).filter(a => a.slug).map(a => `articles/content/${a.slug}.json`),
    );
    const stale = [];
    let token;
    do {
      const page = await s3.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: 'articles/content/',
        ContinuationToken: token,
      }));
      for (const obj of page.Contents || []) {
        if (!shouldExist.has(obj.Key)) stale.push({ Key: obj.Key });
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);

    for (let i = 0; i < stale.length; i += 1000) {
      await s3.send(new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: stale.slice(i, i + 1000), Quiet: true },
      }));
    }
    if (stale.length) {
      console.log(`[sync-r2] Took down ${stale.length} story file(s) no longer published.`);
    }

    console.log(`[sync-r2] Synced ${list.length} articles to R2 as individual files.`);
    return res.status(200).json({
      ok: true,
      total: list.length,
      supabase: supabaseArticles.length,
      seed: seedArticles.length,
      withheld: withheld.size,
      removed: stale.length,
      keys: {
        list: 'articles/articles.json',
        contentPrefix: 'articles/content/',
      },
    });
  } catch (err) {
    console.error('[sync-r2] Error:', err);
    return res.status(500).json({ error: err?.message || 'Sync failed' });
  }
}
