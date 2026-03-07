/**
 * Public Data Service
 * Unified data layer that merges seed articles with admin-created articles.
 * This ensures ALL changes made in the admin panel are reflected on the public site.
 *
 * Priority: Admin articles override seed articles if they share the same ID.
 * Only published articles are shown on the public site.
 */

import { articles as seedArticles, type Article, type Author } from '@/data/seedData';
import {
  getAdminArticlesList,
  type AdminArticle,
  type AdminAuthor,
} from '@/lib/adminDataService';

// ─── Convert AdminArticle → Article ───────────────────────────────────────────
function adminToPublic(admin: AdminArticle): Article {
  return {
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
    publishedAt: new Date(admin.publishedAt),
    updatedAt: admin.updatedAt ? new Date(admin.updatedAt) : undefined,
    readingTime: admin.readingTime,
    tags: admin.tags ?? [],
  };
}

// ─── Merge Seed + Admin Articles ───────────────────────────────────────────────
function mergeAllArticles(): Article[] {
  const map = new Map<string, Article>();

  // First, add all seed articles
  seedArticles.forEach(seed => {
    map.set(String(seed.id), seed);
  });

  // Then, override with admin articles (only published ones)
  getAdminArticlesList()
    .filter(a => a.status === 'published')
    .forEach(admin => {
      map.set(admin.id, adminToPublic(admin));
    });

  return Array.from(map.values());
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function getAllPublicArticles(): Article[] {
  return mergeAllArticles();
}

export function getPublicArticleBySlug(slug: string): Article | undefined {
  return getAllPublicArticles().find(a => a.slug === slug);
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

export function getFeaturedPublicArticle(): Article | undefined {
  const latest = getLatestPublicArticles(1);
  return latest[0];
}

export function getBreakingPublicNews(count: number): Article[] {
  const adminArticles = getAdminArticlesList()
    .filter(a => a.status === 'published' && a.priority === 'breaking')
    .map(adminToPublic);
  
  // Sort by published date, newest first
  return adminArticles
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, count);
}

export function getMostPopularPublic(count: number): Article[] {
  // For now, return latest. In production, this would use view counts.
  return getLatestPublicArticles(count);
}

export function getEditorsPicksPublic(count: number): Article[] {
  // For now, return latest. In production, this would use editor curation.
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
  // First pass: deduplicate by ID (admin authors override seed authors)
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

  // Second pass: deduplicate by normalized name (case-insensitive, trimmed)
  // If multiple authors have the same name, keep only the first one encountered
  const result: Author[] = [];
  const seenNames = new Set<string>();
  
  Array.from(byId.values()).forEach(author => {
    const normalizedName = author.name.trim().toLowerCase();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      result.push(author);
    }
    // Skip if name already seen (duplicate name, different ID)
  });

  return result;
}

export function getAllPublicAuthors(): Author[] {
  return mergeAllAuthors();
}

export function getPublicAuthorById(id: string): Author | undefined {
  return getAllPublicAuthors().find(a => a.id === id);
}
