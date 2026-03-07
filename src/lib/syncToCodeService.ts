/**
 * Sync to Code Service
 * 
 * Updates octagonData.json with current articles and authors.
 * This hardcodes stories into the code so they're always available.
 */

import { getAdminArticlesMap, getAdminAuthorsMap } from './adminDataService';

export interface SyncToCodeResult {
  success: boolean;
  articles: number;
  authors: number;
  newArticles: number;
  newAuthors: number;
  error?: string;
}

export function syncToCode(): SyncToCodeResult {
  try {
    // Get current data
    const articles = getAdminArticlesMap();
    const authors = getAdminAuthorsMap();

    // Read existing seed data
    const seedData = seedDataRaw as any;

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

    // Merge with existing (new data takes precedence)
    const existingArticles = seedData.articles || [];
    const existingAuthors = seedData.authors || [];

    const mergedArticles = [...existingArticles];
    convertedArticles.forEach(article => {
      const idx = mergedArticles.findIndex(a => a.id === article.id);
      if (idx >= 0) {
        mergedArticles[idx] = article; // Update existing
      } else {
        mergedArticles.push(article); // Add new
      }
    });

    const mergedAuthors = [...existingAuthors];
    convertedAuthors.forEach(author => {
      const idx = mergedAuthors.findIndex(a => a.id === author.id);
      if (idx >= 0) {
        mergedAuthors[idx] = author; // Update existing
      } else {
        mergedAuthors.push(author); // Add new
      }
    });

    // Create updated seed data
    const updatedSeedData = {
      sections: seedData.sections || [],
      authors: mergedAuthors,
      articles: mergedArticles,
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
