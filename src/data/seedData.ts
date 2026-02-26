// Seed data for The Octagon newspaper website
// Data imported from WordPress export

import octagonDataRaw from './octagonData.json';

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

// Authors – ensure all have required fields
export const authors: Author[] = Array.isArray(octagonData?.authors)
  ? (octagonData.authors as any[]).map((author: any) => ({
      ...author,
      twitter: author.twitter || undefined,
    })) as Author[]
  : [];

// Articles – convert dates and ensure proper formatting
export const articles: Article[] = Array.isArray(octagonData?.articles)
  ? (octagonData.articles as any[]).map(convertArticle) as Article[]
  : [];

// Helper functions
export const getArticleBySlug = (slug: string): Article | undefined => {
  return articles.find((article) => article.slug === slug);
};

export const getArticlesBySection = (sectionSlug: string): Article[] => {
  return articles.filter((article) => article.section === sectionSlug);
};

/** Most recent article overall — used as the homepage hero. */
export const getFeaturedArticle = (): Article | undefined => {
  return [...articles].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];
};

/** No real breaking-news flag exists in the data — always empty. */
export const getBreakingNews = (): Article[] => [];

/** "Most read" sidebar — sorted by publish date since no real view counts exist. */
export const getMostPopular = (limit: number = 5): Article[] => {
  return [...articles]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getLatestArticles = (limit: number = 10): Article[] => {
  return [...articles]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getTopStories = (limit: number = 4): Article[] => {
  return [...articles]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

/** Long reads: readingTime >= 5 minutes */
export const getLongReadArticles = (limit: number = 6): Article[] => {
  return [...articles]
    .filter((a) => (a.readingTime ?? 0) >= 5)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

/** Editors' picks: most recent articles across all sections. */
export const getEditorsPicks = (limit: number = 5): Article[] => {
  return [...articles]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getSectionBySlug = (slug: string): Section | undefined => {
  return sections.find((section) => section.slug === slug);
};

export const getAuthorById = (id: string): Author | undefined => {
  return authors.find((author) => author.id === id);
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
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
};
