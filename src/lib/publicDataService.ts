/**
 * Public Data Service
 *
 * Unified data layer for the public-facing site.
 *
 * Data priority (highest → lowest):
 *   1. R2 cache — set by DataSyncContext after fetching articles/articles.json from R2.
 *      R2 is the zero-egress source of truth for the public site.
 *   2. Admin localStorage — for offline fallback / devices without R2 data yet.
 *   3. Seed articles (octagonData.json) — historical WordPress export, always available.
 *
 * When the CMS publishes an article → Supabase saves → /api/sync-r2 runs →
 * R2 JSON files update → DataSyncContext picks up the change → public site
 * re-renders with fresh data — all without a redeploy, across all devices.
 */

import { articles as seedArticles, type Article, type Author } from '@/data/seedData';
import {
  getAdminArticlesList, getDeletedArticleIds,
  type AdminArticle,
  type AdminAuthor,
} from '@/lib/adminDataService';
import type { R2ArticleListItem } from '@/lib/r2Articles';
import { normalizeArticle, slugMatches } from '@/lib/normalizeArticle';
import { readCoAuthors } from '@/lib/coAuthors';

// The bundled WordPress export isn't runtime-type-checked either (it contains
// e.g. a numeric tag and a numeric slug). Normalise it once, lazily, rather
// than on every merge — mergeAllArticles runs many times per render.
let normalizedSeed: Article[] | null = null;
function getSeedArticles(): Article[] {
  if (!normalizedSeed) normalizedSeed = seedArticles.map(normalizeArticle);
  return normalizedSeed;
}

// ─── R2 Cache (populated by DataSyncContext) ──────────────────────────────────

let r2ArticleList: Article[] | null = null;
const r2FeaturedIds = new Set<string>();
const r2BreakingIds = new Set<string>();

/**
 * Called by DataSyncContext after it fetches article list from R2.
 * Triggers a re-render of all public pages via syncVersion bump.
 */
export function setR2ArticleCache(items: R2ArticleListItem[]): void {
  r2ArticleList = items.map(i => normalizeArticle(i.article));
  r2FeaturedIds.clear();
  r2BreakingIds.clear();
  items.forEach(i => {
    if (i.featured) r2FeaturedIds.add(String(i.article.id));
    if (i.priority === 'breaking') r2BreakingIds.add(String(i.article.id));
  });
}

export function clearR2ArticleCache(): void {
  r2ArticleList = null;
  r2FeaturedIds.clear();
  r2BreakingIds.clear();
}

// ─── Convert AdminArticle → Article ───────────────────────────────────────────
function adminToPublic(admin: AdminArticle): Article {
  return normalizeArticle({
    id: admin.id,
    slug: admin.slug,
    headline: admin.headline,
    dek: admin.dek,
    body: admin.body,
    image: admin.image,
    images: admin.images ?? [],
    imageCaption: admin.imageCaption,
    section: admin.section,
    author: {
      id: admin.author.id,
      name: admin.author.name,
      role: admin.author.role,
      bio: admin.author.bio,
      image: admin.author.image,
      email: admin.author.email,
      twitter: admin.author.twitter,
    },
    coAuthors: readCoAuthors(admin.internalNotes),
    publishedAt: new Date(admin.publishedAt),
    updatedAt: admin.updatedAt ? new Date(admin.updatedAt) : undefined,
    readingTime: admin.readingTime,
    tags: admin.tags ?? [],
  });
}

// ─── Merge Seed + Admin/R2 Articles ──────────────────────────────────────────

function mergeAllArticles(): Article[] {
  const deletedIds = new Set(getDeletedArticleIds().map(String));
  const map = new Map<string, Article>();
  const slugMap = new Map<string, string>(); // slug -> id

  // Base layer: seed articles (always available, historical WordPress export)
  getSeedArticles().forEach(seed => {
    if (!deletedIds.has(String(seed.id))) {
      const id = String(seed.id);
      map.set(id, seed);
      if (seed.slug) slugMap.set(seed.slug, id);
    }
  });

  if (r2ArticleList !== null) {
    // R2 is available — use it as source of truth for CMS articles.
    // R2 list articles might not have a body, so we merge carefully.
    r2ArticleList
      .filter(a => !deletedIds.has(String(a.id)))
      .forEach(a => {
        const id = String(a.id);
        // Try matching by ID first, then by slug (important for seed data migration)
        let existingId = id;
        if (!map.has(id) && a.slug && slugMap.has(a.slug)) {
          existingId = slugMap.get(a.slug)!;
        }

        const existing = map.get(existingId);
        if (existing && !a.body && existing.body) {
          // Preserve existing body if the new one is empty
          map.set(id, { ...a, body: existing.body });
        } else {
          map.set(id, a);
        }
      });
  } else {
    // R2 not loaded yet — fall back to localStorage admin articles.
    getAdminArticlesList()
      .filter(a => a.status === 'published' && !deletedIds.has(a.id))
      .forEach(admin => {
        const a = adminToPublic(admin);
        const id = String(a.id);
        
        let existingId = id;
        if (!map.has(id) && a.slug && slugMap.has(a.slug)) {
          existingId = slugMap.get(a.slug)!;
        }

        const existing = map.get(existingId);
        if (existing && !a.body && existing.body) {
          map.set(id, { ...a, body: existing.body });
        } else {
          map.set(id, a);
        }
      });
  }

  return Array.from(map.values());
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function getAllPublicArticles(): Article[] {
  return mergeAllArticles();
}

export function getPublicArticleBySlug(slug: string): Article | undefined {
  // Compare loosely: at least one production row has a numeric slug, which a
  // strict === against the string from the URL would never match, leaving the
  // article permanently unreachable.
  return getAllPublicArticles().find(a => slugMatches(a.slug, slug));
}

export function getPublicArticleById(id: string): Article | undefined {
  return getAllPublicArticles().find(a => String(a.id) === String(id));
}

export function getPublicArticlesBySection(section: string): Article[] {
  return getAllPublicArticles()
    .filter(a => a.section === section)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export function getLatestPublicArticles(count: number): Article[] {
  return getAllPublicArticles()
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, count);
}

/**
 * How long a story leads the site because an editor featured it.
 *
 * Featuring is deliberate, but nobody remembers to undo it. One editorial
 * flagged in March was still the front-page lead months later, ahead of a dozen
 * newer stories, because the flag never expired. Letting it lapse means the
 * front page keeps moving on its own while the newsroom is busy, and an editor
 * who wants something held up simply features it again.
 */
const FEATURE_LASTS_DAYS = 21;

const stillFresh = (published: Date) =>
  Date.now() - published.getTime() < FEATURE_LASTS_DAYS * 24 * 60 * 60 * 1000;

export function getFeaturedPublicArticle(): Article | undefined {
  if (r2ArticleList !== null) {
    // Use R2 featured metadata
    const featured = r2ArticleList
      .filter(a => r2FeaturedIds.has(String(a.id)))
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    if (featured.length > 0 && stillFresh(featured[0].publishedAt)) return featured[0];
    return getLatestPublicArticles(1)[0];
  }

  // Fallback: check admin articles for featured flag
  const adminArticles = getAdminArticlesList()
    .filter(a => a.status === 'published' && a.featured === true)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  if (adminArticles.length > 0 && stillFresh(new Date(adminArticles[0].publishedAt))) {
    return adminToPublic(adminArticles[0]);
  }
  return getLatestPublicArticles(1)[0];
}

export function getBreakingPublicNews(count: number): Article[] {
  if (r2ArticleList !== null) {
    return r2ArticleList
      .filter(a => r2BreakingIds.has(String(a.id)))
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, count);
  }

  // Fallback: check admin articles for breaking priority
  return getAdminArticlesList()
    .filter(a => a.status === 'published' && a.priority === 'breaking')
    .map(adminToPublic)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, count);
}

export function getMostPopularPublic(count: number): Article[] {
  return getLatestPublicArticles(count);
}

export function getEditorsPicksPublic(count: number): Article[] {
  return getLatestPublicArticles(count);
}

export function getLongReadPublicArticles(count: number): Article[] {
  return getAllPublicArticles()
    .filter(a => a.readingTime >= 5)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, count);
}

// ─── Authors ────────────────────────────────────────────────────────────────────
import { authors as seedAuthors } from '@/data/seedData';
import { getAdminAuthorsList } from '@/lib/adminDataService';

function mergeAllAuthors(): Author[] {
  const byId = new Map<string, Author>();

  seedAuthors.forEach(seed => {
    byId.set(seed.id, seed);
  });

  getAdminAuthorsList().forEach(admin => {
    byId.set(admin.id, {
      id: admin.id,
      name: admin.name,
      role: admin.role,
      bio: admin.bio,
      image: admin.image,
      email: admin.email,
      twitter: admin.twitter,
    });
  });

  const result: Author[] = [];
  const seenNames = new Set<string>();

  Array.from(byId.values()).forEach(author => {
    const normalizedName = author.name.trim().toLowerCase();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      result.push(author);
    }
  });

  return result;
}

export function getAllPublicAuthors(): Author[] {
  return mergeAllAuthors();
}

export function getPublicAuthorById(id: string): Author | undefined {
  return getAllPublicAuthors().find(a => a.id === id);
}
