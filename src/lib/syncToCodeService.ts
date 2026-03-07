/**
 * Sync to Code Service
 * 
 * Updates octagonData.json with current articles and authors.
 * This hardcodes stories into the code so they're always available.
 */

import { getAdminArticlesMap, getAdminAuthorsMap } from './adminDataService';
import { sections } from '@/data/seedData';

export interface SyncToCodeResult {
  success: boolean;
  articles: number;
  authors: number;
  newArticles: number;
  newAuthors: number;
  error?: string;
}

export async function syncToCode(): Promise<SyncToCodeResult> {
  try {
    // Get current data
    const articles = getAdminArticlesMap();
    const authors = getAdminAuthorsMap();

    // Use sections from seedData (they're static)
    // We'll merge articles/authors with existing seed data structure

    // Convert AdminArticle format to Article format (only published)
    const convertedArticles = Object.values(articles)
      .filter(a => a.status === 'published')
      .map(article => ({
        id: article.id,
        slug: article.slug,
        headline: article.headline,
        dek: article.dek || '',
        body: article.body,
        image: article.image || '',
        images: article.images || [],
        imageCaption: article.imageCaption || '',
        section: article.section,
        author: {
          id: article.author.id,
          name: article.author.name,
          role: article.author.role || 'Student Journalist',
          bio: article.author.bio || '',
          image: article.author.image || '',
          email: article.author.email,
          twitter: article.author.twitter,
        },
        publishedAt: article.publishedAt,
        updatedAt: article.updatedAt,
        readingTime: article.readingTime || 1,
        tags: article.tags || [],
      }));

    // Convert AdminAuthor format to Author format
    const convertedAuthors = Object.values(authors).map(author => ({
      id: author.id,
      name: author.name,
      role: author.role || 'Student Journalist',
      bio: author.bio || '',
      image: author.image || '',
      email: author.email,
      twitter: author.twitter,
    }));

    // For now, use current data only (user can manually merge with existing seed if needed)
    // In production, you'd fetch existing seedData.json and merge
    const updatedSeedData = {
      sections: sections.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
      })),
      authors: convertedAuthors,
      articles: convertedArticles,
    };

    // Download as JSON file (user can then commit it)
    const blob = new Blob([JSON.stringify(updatedSeedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `octagonData-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return {
      success: true,
      articles: mergedArticles.length,
      authors: mergedAuthors.length,
      newArticles: convertedArticles.length,
      newAuthors: convertedAuthors.length,
    };
  } catch (error) {
    console.error('Error syncing to code:', error);
    return {
      success: false,
      articles: 0,
      authors: 0,
      newArticles: 0,
      newAuthors: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
