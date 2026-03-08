// Seed data for The Octagon newspaper website
// Data imported from WordPress export + admin-created articles via localStorage

import octagonDataRaw from './octagonData.json';
import {
  getAdminArticlesList,
  getDeletedArticleIds,
  getAdminAuthorsList,
  getDeletedAuthorIds,
} from '../lib/adminDataService';

const octagonData = octagonDataRaw && typeof octagonDataRaw === 'object' ? octagonDataRaw : { sections: [], authors: [], articles: [] };

export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  twitter?: string;
  email?: string;
}

export interface Article {
  id: string;
  slug: string;
  headline: string;
  dek: string;
  body: string;
  image: string;
  images?: string[];
  imageCaption: string;
  section: string;
  author: Author;
  publishedAt: Date;
  updatedAt?: Date;
  readingTime: number;
  tags: string[];
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  description: string;
}

// Convert JSON data to proper types with Date objects
const convertArticle = (article: any): Article => ({
  ...article,
  publishedAt: new Date(article.publishedAt),
  updatedAt: article.updatedAt ? new Date(article.updatedAt) : undefined,
});

// Sections – defensive in case JSON structure is missing
export const sections: Section[] = Array.isArray(octagonData?.sections) ? (octagonData.sections as Section[]) : [];

// Authors – ensure all have required fields (static JSON set)
export const authors: Author[] = Array.isArray(octagonData?.authors)
  ? (octagonData.authors as any[]).map((author: any) => ({
      ...author,
      twitter: author.twitter || undefined,
    })) as Author[]
  : [];

// Articles – static JSON set (for backward compatibility)
export const articles: Article[] = Array.isArray(octagonData?.articles)
  ? (octagonData.articles as any[]).map(convertArticle) as Article[]
  : [];

// ─── Dynamic merged data ─────────────────────────────────────────────────────
// These functions re-read localStorage on every call so newly published
// admin articles appear without a full page reload.

/**
 * Returns ALL articles: JSON baseline + admin-created + admin-edited,
 * minus any that were deleted. Only returns published articles.
 * This is the canonical source for all public-facing helpers below.
 */
function _allArticles(): Article[] {
  const deletedIds = new Set(getDeletedArticleIds().map(String));
  const adminArticles = getAdminArticlesList();

  // Start with JSON articles, filtering out deleted ones
  const merged = new Map<string, Article>();
  for (const a of articles) {
    if (!deletedIds.has(String(a.id))) {
      merged.set(String(a.id), a);
    }
  }

  // Admin articles override JSON (or add new ones) – only published
  for (const a of adminArticles) {
    if (a.status !== 'published') continue;
    if (deletedIds.has(String(a.id))) continue;
    merged.set(a.id, {
      id: a.id,
      slug: a.slug,
      headline: a.headline,
      dek: a.dek,
      body: a.body,
      image: a.image,
      images: a.images,
      imageCaption: a.imageCaption,
      section: a.section,
      author: a.author as Author,
      publishedAt: new Date(a.publishedAt),
      updatedAt: a.updatedAt ? new Date(a.updatedAt) : undefined,
      readingTime: a.readingTime,
      tags: a.tags,
    });
  }

  return Array.from(merged.values());
}

/** Returns all merged authors (JSON + admin-created). */
function _allAuthors(): Author[] {
  const deletedIds = new Set(getDeletedAuthorIds());
  const merged = new Map<string, Author>();
  for (const a of authors) {
    if (!deletedIds.has(a.id)) {
      merged.set(a.id, a);
    }
  }
  for (const a of getAdminAuthorsList()) {
    if (!deletedIds.has(a.id)) {
      merged.set(a.id, a as Author);
    }
  }
  return Array.from(merged.values());
}

// ─── Public API: all helpers re-compute from merged data ─────────────────────

/** Get all articles (JSON + admin, published only). Call this instead of `articles`. */
export const getArticles = (): Article[] => _allArticles();

export const getArticleBySlug = (slug: string): Article | undefined => {
  return _allArticles().find((article) => article.slug === slug);
};

export const getArticlesBySection = (sectionSlug: string): Article[] => {
  return _allArticles().filter((article) => article.section === sectionSlug);
};

/** Most recent article overall — used as the homepage hero. */
export const getFeaturedArticle = (): Article | undefined => {
  return [..._allArticles()].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];
};

/** No real breaking-news flag exists in the data — always empty. */
export const getBreakingNews = (): Article[] => [];

/** "Most read" sidebar — sorted by publish date since no real view counts exist. */
export const getMostPopular = (limit: number = 5): Article[] => {
  return [..._allArticles()]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getLatestArticles = (limit: number = 10): Article[] => {
  return [..._allArticles()]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getTopStories = (limit: number = 4): Article[] => {
  return [..._allArticles()]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

/** Long reads: readingTime >= 5 minutes */
export const getLongReadArticles = (limit: number = 6): Article[] => {
  return [..._allArticles()]
    .filter((a) => (a.readingTime ?? 0) >= 5)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

/** Editors' picks: most recent articles across all sections. */
export const getEditorsPicks = (limit: number = 5): Article[] => {
  return [..._allArticles()]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getSectionBySlug = (slug: string): Section | undefined => {
  return sections.find((section) => section.slug === slug);
};

export const getAuthorById = (id: string): Author | undefined => {
  return _allAuthors().find((author) => author.id === id);
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatTimestamp = (date: Date): string => {
  // Always show month and day format consistently (e.g., "Jan 15", "Dec 3")
  // This avoids negative time issues and matches the format of older stories
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
};
