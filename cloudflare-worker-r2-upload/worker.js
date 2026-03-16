/**
 * Cloudflare Worker: accept image upload (multipart/form-data), store in R2, return public URL.
 * Protect with header X-R2-Secret (set R2_SECRET in Worker secrets).
 * Set R2_PUBLIC_BASE_URL in wrangler.toml (e.g. https://pub-xxx.r2.dev/octagon-images).
 */

const ALLOWED_ORIGINS = ['https://scdsoctagon.net', 'http://localhost:5173', 'http://127.0.0.1:5173'];

function corsHeaders(origin) {
  const o = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-R2-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

function getExtension(filename, contentType) {
  if (filename && filename.includes('.')) {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'].includes(ext)) return ext;
  }
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/avif': '.avif',
  };
  return map[contentType] || '.jpg';
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    if (env.R2_SECRET && request.headers.get('X-R2-Secret') !== env.R2_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const baseUrl = env.R2_PUBLIC_BASE_URL;
    if (!baseUrl || !env.BUCKET) {
      return new Response(JSON.stringify({ error: 'Worker not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return new Response(JSON.stringify({ error: 'Missing file in form field "file"' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }

      const ext = getExtension(file.name, file.type);
      const key = `images/${crypto.randomUUID()}${ext}`;

      await env.BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type || 'image/jpeg' },
      });

      const url = baseUrl.endsWith('/') ? `${baseUrl}${key}` : `${baseUrl}/${key}`;
      return new Response(JSON.stringify({ url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || 'Upload failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      );
    }
  },
};
