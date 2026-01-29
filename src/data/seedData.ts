// Seed data for The Octagon newspaper website
// Data imported from WordPress export

import octagonData from './octagonData.json';

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
  imageCaption: string;
  section: string;
  author: Author;
  publishedAt: Date;
  updatedAt?: Date;
  readingTime: number;
  tags: string[];
  isBreaking?: boolean;
  isFeatured?: boolean;
  views?: number;
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

// Sections
export const sections: Section[] = octagonData.sections as Section[];

// Authors - ensure all have required fields
export const authors: Author[] = octagonData.authors.map((author: any) => ({
  ...author,
  twitter: author.twitter || undefined,
})) as Author[];

// Articles - convert dates and ensure proper formatting
export const articles: Article[] = octagonData.articles.map(convertArticle) as Article[];

// Helper functions
export const getArticleBySlug = (slug: string): Article | undefined => {
  return articles.find((article) => article.slug === slug);
};

export const getArticlesBySection = (sectionSlug: string): Article[] => {
  return articles.filter((article) => article.section === sectionSlug);
};

export const getFeaturedArticle = (): Article | undefined => {
  return articles.find((article) => article.isFeatured);
};

export const getBreakingNews = (): Article[] => {
  return articles.filter((article) => article.isBreaking);
};

export const getMostPopular = (limit: number = 5): Article[] => {
  return [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, limit);
};

export const getLatestArticles = (limit: number = 10): Article[] => {
  return [...articles]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, limit);
};

export const getTopStories = (limit: number = 4): Article[] => {
  return articles
    .filter((article) => !article.isFeatured)
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
