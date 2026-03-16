/**
 * Public article data from R2 (articles-by-slug.json).
 * Used so the public site never hits Supabase for article bodies — cuts PostgREST egress.
 */

import type { Article } from '@/data/seedData';

const R2_PUBLIC_BASE = import.meta.env.VITE_R2_PUBLIC_BASE_URL as string | undefined;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

type BySlugRaw = Record<string, {
  id: string;
  slug: string;
  headline: string;
  dek: string;
  body: string;
  image: string;
  images?: string[];
  imageCaption?: string;
  section: string;
  author: { id: string; name: string };
  publishedAt: string;
  updatedAt?: string;
  readingTime: number;
  tags: string[];
}>;

let cached: BySlugRaw | null = null;
let cachedAt = 0;

function rawToArticle(raw: BySlugRaw[string]): Article {
  return {
    id: raw.id,
    slug: raw.slug,
    headline: raw.headline,
    dek: raw.dek,
    body: raw.body,
    image: raw.image,
    images: raw.images ?? [],
    imageCaption: raw.imageCaption ?? '',
    section: raw.section,
    author: {
      id: raw.author?.id ?? '',
      name: raw.author?.name ?? 'Unknown',
      role: 'Student Journalist',
      bio: '',
      image: '',
    },
    publishedAt: new Date(raw.publishedAt),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
    readingTime: raw.readingTime ?? 1,
    tags: raw.tags ?? [],
  };
}

export function isR2ArticlesConfigured(): boolean {
  return Boolean(R2_PUBLIC_BASE?.trim());
}

/**
 * Fetch article by slug from R2 JSON. Returns null if R2 not configured, slug not found, or fetch fails.
 */
export async function getArticleBySlugFromR2(slug: string): Promise<Article | null> {
  if (!R2_PUBLIC_BASE?.trim()) return null;
  const url = `${R2_PUBLIC_BASE.replace(/\/$/, '')}/articles/articles-by-slug.json`;
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    const raw = cached[slug];
    return raw ? rawToArticle(raw) : null;
  }
  try {
    const res = await fetch(url, { cache: 'default' });
    if (!res.ok) return null;
    const data = (await res.json()) as BySlugRaw;
    cached = data;
    cachedAt = now;
    const raw = data[slug];
    return raw ? rawToArticle(raw) : null;
  } catch {
    return null;
  }
}
