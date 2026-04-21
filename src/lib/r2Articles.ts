/**
 * Public article data from R2.
 *
 * Two JSON files are maintained by /api/sync-r2 (triggered after every CMS save):
 *   articles/articles.json        — list without body (for homepage / section pages)
 *   articles/articles-by-slug.json — full articles with body (for article pages)
 *
 * Reading from R2 produces zero Supabase egress and zero Cloudflare egress fees.
 */

import type { Article } from '@/data/seedData';

const R2_PUBLIC_BASE = import.meta.env.VITE_R2_PUBLIC_BASE_URL as string | undefined;
const CACHE_TTL_MS = 90 * 1000; // 90 seconds — kept short so polls always get fresh R2 data

// ─── Raw types from R2 JSON ───────────────────────────────────────────────────

type R2Author = {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  image?: string;
  email?: string;
  twitter?: string;
};

type R2ArticleRaw = {
  id: string;
  slug: string;
  headline: string;
  dek: string;
  body: string;
  image: string;
  images?: string[];
  imageCaption?: string;
  section: string;
  author: R2Author;
  publishedAt: string;
  updatedAt?: string;
  readingTime: number;
  tags: string[];
  featured?: boolean;
  priority?: string;
};

type R2ListItemRaw = Omit<R2ArticleRaw, 'body'>;

type BySlugRaw = Record<string, R2ArticleRaw>;

// ─── Public export types ──────────────────────────────────────────────────────

export interface R2ArticleListItem {
  article: Article;
  featured: boolean;
  priority: string;
}

// ─── Converters ───────────────────────────────────────────────────────────────

function rawToArticle(raw: R2ArticleRaw | R2ListItemRaw, body = ''): Article {
  return {
    id: raw.id,
    slug: raw.slug,
    headline: raw.headline,
    dek: raw.dek,
    body: 'body' in raw ? (raw.body ?? body) : body,
    image: raw.image ?? '',
    images: raw.images ?? [],
    imageCaption: raw.imageCaption ?? '',
    section: raw.section,
    author: {
      id: raw.author?.id ?? '',
      name: raw.author?.name ?? 'Unknown',
      role: raw.author?.role ?? 'Student Journalist',
      bio: raw.author?.bio ?? '',
      image: raw.author?.image ?? '',
      email: raw.author?.email,
      twitter: raw.author?.twitter,
    },
    publishedAt: new Date(raw.publishedAt),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
    readingTime: raw.readingTime ?? 1,
    tags: raw.tags ?? [],
  };
}

// ─── Article list cache (no body) ────────────────────────────────────────────

let listCached: R2ArticleListItem[] | null = null;
let listCachedAt = 0;

export function isR2ArticlesConfigured(): boolean {
  return Boolean(R2_PUBLIC_BASE?.trim());
}

/**
 * Fetch full article list (no body) from R2.
 * Used by the public site for homepage and section pages.
 * Returns null when R2 is not configured.
 */
export async function getArticleListFromR2(): Promise<R2ArticleListItem[] | null> {
  if (!R2_PUBLIC_BASE?.trim()) return null;
  const now = Date.now();
  if (listCached && now - listCachedAt < CACHE_TTL_MS) return listCached;

  const url = `${R2_PUBLIC_BASE.replace(/\/$/, '')}/articles/articles.json?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as R2ListItemRaw[];
    const items: R2ArticleListItem[] = data.map(raw => ({
      article: rawToArticle(raw),
      featured: raw.featured ?? false,
      priority: raw.priority ?? 'normal',
    }));
    listCached = items;
    listCachedAt = now;
    return items;
  } catch {
    return null;
  }
}

// ─── Individual article cache (full body) ────────────────────────────────────
const articleCache = new Map<string, { article: Article; fetchedAt: number }>();

/**
 * Fetch a single article by slug from R2 (includes body).
 * Each article is stored in its own small JSON file to minimize egress.
 * Used by the article page. Falls back to null when R2 is not configured.
 */
export async function getArticleBySlugFromR2(slug: string): Promise<Article | null> {
  if (!R2_PUBLIC_BASE?.trim()) return null;
  
  const now = Date.now();
  const cached = articleCache.get(slug);
  if (cached && (now - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.article;
  }

  const url = `${R2_PUBLIC_BASE.replace(/\/$/, '')}/articles/content/${slug}.json?t=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as R2ArticleRaw;
    const article = rawToArticle(data);
    articleCache.set(slug, { article, fetchedAt: now });
    return article;
  } catch {
    return null;
  }
}

/**
 * Bust all in-memory caches. Call after a successful R2 sync so the next
 * fetch picks up freshly published articles.
 */
export function clearR2Cache(): void {
  articleCache.clear();
  listCached = null;
  listCachedAt = 0;
}
