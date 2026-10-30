/**
 * Defensive normalisation for article data.
 *
 * Articles arrive from three sources — the bundled WordPress seed, Cloudflare
 * R2 JSON, and Supabase — none of which are type-checked at runtime. Real data
 * in production contains values that violate the Article type: a tag that is
 * the number 2020, a slug that is the number 45597, and so on. Any component
 * that then calls a string method (`slug.toLowerCase()`, `tag.includes()`)
 * throws "x.toLowerCase is not a function" and takes the whole page down,
 * because a render-time throw unmounts the React tree.
 *
 * Rather than sprinkling `String(...)` guards at every call site, coerce once
 * at the point the data enters the app. Fixing the underlying rows is still
 * worthwhile, but this makes a single malformed row a cosmetic problem instead
 * of a blank screen.
 */

import type { Article, Author } from '@/data/seedData';

/** Coerce to a string. null/undefined/NaN become ''. */
export function str(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return String(value);
  // Objects/arrays are never meaningful here — don't render "[object Object]".
  return fallback;
}

/** Coerce to an array of non-empty strings. */
export function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const s = str(item).trim();
    if (s) out.push(s);
  }
  return out;
}

/** Coerce to a finite number, else the fallback. */
export function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to a valid Date, else `new Date(0)` so sorting never produces NaN. */
export function date(value: unknown): Date {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(0) : value;
  const d = new Date(str(value));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function normalizeAuthor(value: unknown): Author {
  const a = (value ?? {}) as Record<string, unknown>;
  return {
    id: str(a.id),
    name: str(a.name, 'Unknown'),
    role: str(a.role, 'Student Journalist'),
    bio: str(a.bio),
    image: str(a.image),
    email: a.email === undefined ? undefined : str(a.email),
    twitter: a.twitter === undefined ? undefined : str(a.twitter),
  };
}

/** Co-authors, dropping anything without a name to print in the byline. */
function normalizeCoAuthors(value: unknown): Author[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a) => a && typeof a === 'object' && str((a as Record<string, unknown>).name).trim())
    .map(normalizeAuthor);
}

/**
 * Make an article safe to render and search, whatever shape it arrived in.
 * Returns a new object; the input is not mutated.
 */
export function normalizeArticle(input: unknown): Article {
  const a = (input ?? {}) as Record<string, unknown>;
  return {
    ...(a as object),
    id: str(a.id),
    slug: str(a.slug),
    headline: str(a.headline),
    dek: str(a.dek),
    body: str(a.body),
    image: str(a.image),
    images: strArray(a.images),
    imageCaption: str(a.imageCaption),
    section: str(a.section),
    author: normalizeAuthor(a.author),
    coAuthors: normalizeCoAuthors(a.coAuthors),
    topics: strArray(a.topics),
    publishedAt: date(a.publishedAt),
    updatedAt: a.updatedAt ? date(a.updatedAt) : undefined,
    readingTime: num(a.readingTime, 1),
    tags: strArray(a.tags),
  } as Article;
}

/** Normalise a list, dropping anything that isn't an object at all. */
export function normalizeArticles(input: unknown): Article[] {
  if (!Array.isArray(input)) return [];
  return input.filter((a) => a && typeof a === 'object').map(normalizeArticle);
}

/** Case/'type'-insensitive slug comparison, safe against numeric slugs. */
export function slugMatches(a: unknown, b: unknown): boolean {
  return str(a).trim().toLowerCase() === str(b).trim().toLowerCase();
}
