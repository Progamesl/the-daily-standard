/**
 * Sync Current Data to Code
 * 
 * Updates octagonData.json with all current articles and authors from localStorage/Supabase.
 * This hardcodes stories into the code so they're always available.
 * 
 * Run this from admin panel or manually: node scripts/sync-to-code.js
 */

const fs = require('fs');
const path = require('path');

// This will be called from the browser, so we need to handle it differently
// For now, this is a template - we'll call it via a server endpoint or direct file write

const seedDataPath = path.join(__dirname, '../src/data/octagonData.json');

function syncToCode(articles, authors) {
  try {
    // Read existing seed data
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

    // Convert AdminArticle format to Article format
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
    const existingArticleIds = new Set((seedData.articles || []).map(a => a.id));
    const existingAuthorIds = new Set((seedData.authors || []).map(a => a.id));

    const mergedArticles = [...(seedData.articles || [])];
    convertedArticles.forEach(article => {
      const idx = mergedArticles.findIndex(a => a.id === article.id);
      if (idx >= 0) {
        mergedArticles[idx] = article;
      } else {
        mergedArticles.push(article);
      }
    });

    const mergedAuthors = [...(seedData.authors || [])];
    convertedAuthors.forEach(author => {
      const idx = mergedAuthors.findIndex(a => a.id === author.id);
      if (idx >= 0) {
        mergedAuthors[idx] = author;
      } else {
        mergedAuthors.push(author);
      }
    });

    // Update seed data
    const updatedSeedData = {
      sections: seedData.sections || [],
      authors: mergedAuthors,
      articles: mergedArticles,
    };

    // Write back
    fs.writeFileSync(seedDataPath, JSON.stringify(updatedSeedData, null, 2));

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
      error: error.message,
    };
  }
}

// If called directly from command line (for testing)
if (require.main === module) {
  console.log('This script is meant to be called from the admin panel.');
  console.log('It will update octagonData.json with current articles and authors.');
}

module.exports = { syncToCode };
