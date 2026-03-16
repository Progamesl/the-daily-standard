import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load env
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
  console.error('Missing R2 credentials or endpoint');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_S3_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function articleToPublic(row) {
  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    dek: row.dek,
    body: row.body,
    image: row.image,
    images: row.images || [],
    imageCaption: row.image_caption,
    section: row.section,
    author: {
      id: row.author_id,
      name: row.author_name,
    },
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingTime: row.reading_time,
    tags: row.tags || [],
  };
}

async function main() {
  console.log('Fetching published articles from Supabase…');
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, headline, dek, body, image, images, image_caption, section, author_id, author_name, published_at, updated_at, reading_time, tags, status')
    .eq('status', 'published');

  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }

  const articles = (data || []).map(articleToPublic);
  console.log(`Fetched ${articles.length} published articles`);

  const list = articles
    .map(a => ({
      id: a.id,
      slug: a.slug,
      headline: a.headline,
      dek: a.dek,
      image: a.image,
      images: a.images,
      imageCaption: a.imageCaption,
      section: a.section,
      author: a.author,
      publishedAt: a.publishedAt,
      readingTime: a.readingTime,
      tags: a.tags,
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const bySlug = {};
  for (const a of articles) {
    bySlug[a.slug] = a;
  }

  const uploads = [
    { key: 'articles/articles.json', body: JSON.stringify(list) },
    { key: 'articles/articles-by-slug.json', body: JSON.stringify(bySlug) },
  ];

  for (const u of uploads) {
    console.log(`Uploading ${u.key} to R2…`);
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: u.key,
        Body: u.body,
        ContentType: 'application/json',
        CacheControl: 'public, max-age=60',
      }),
    );
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

