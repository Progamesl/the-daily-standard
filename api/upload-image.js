/**
 * POST /api/upload-image
 *
 * Accepts a raw image binary body, uploads it to Cloudflare R2, and returns
 * the public URL.  Because this runs on the same Vercel origin as the app,
 * there are zero CORS issues regardless of whether the visitor is on
 * scdsoctagon.net or www.scdsoctagon.net.
 *
 * Required env vars (already set for /api/sync-r2):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_S3_ENDPOINT
 *   R2_BUCKET              (defaults to "octagon-images")
 *   VITE_R2_PUBLIC_BASE_URL (e.g. https://pub-xxx.r2.dev)
 *
 * Request headers:
 *   Content-Type: image/jpeg | image/png | image/webp | …
 *   X-File-Name:  original filename (optional, used for extension detection)
 *
 * Response: { url: "https://pub-xxx.r2.dev/images/<uuid>.jpg" }
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export const config = {
  api: {
    bodyParser: false,   // we read the raw stream ourselves
    sizeLimit: '10mb',
  },
};

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET = 'octagon-images',
  R2_S3_ENDPOINT,
  VITE_R2_PUBLIC_BASE_URL,
} = process.env;

function getExtension(contentType, filename) {
  if (filename) {
    const m = filename.match(/\.[a-z0-9]+$/i);
    if (m) return m[0].toLowerCase();
  }
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
  };
  return map[contentType] || '.jpg';
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  // CORS headers so the admin works on any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-File-Name');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_S3_ENDPOINT) {
    return res.status(500).json({ error: 'R2 credentials not configured on server' });
  }
  if (!VITE_R2_PUBLIC_BASE_URL) {
    return res.status(500).json({ error: 'VITE_R2_PUBLIC_BASE_URL not set on server' });
  }

  let buffer;
  try {
    buffer = await readBody(req);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to read request body' });
  }

  if (!buffer || buffer.length === 0) {
    return res.status(400).json({ error: 'Empty request body — no image received' });
  }

  const contentType = (req.headers['content-type'] || 'image/jpeg').split(';')[0].trim();
  const filename = req.headers['x-file-name'] || '';
  const ext = getExtension(contentType, filename);
  const key = `images/${randomUUID()}${ext}`;

  try {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: R2_S3_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const base = VITE_R2_PUBLIC_BASE_URL.replace(/\/$/, '');
    const url = `${base}/${key}`;
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[upload-image] R2 upload failed:', err);
    return res.status(500).json({ error: err?.message || 'Upload failed' });
  }
}
