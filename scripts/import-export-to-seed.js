/**
 * Import JSON Export to Seed Data
 * 
 * Converts admin export JSON to seedData format and updates octagonData.json
 * This hardcodes all stories into the code so they're always available.
 */

const fs = require('fs');
const path = require('path');

const exportPath = process.argv[2] || '/Users/sidshukla/Downloads/the-octagon-export-2026-03-07.json';
const seedDataPath = path.join(__dirname, '../src/data/octagonData.json');

console.log('📖 Reading export file:', exportPath);
const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));

console.log('📖 Reading existing seed data:', seedDataPath);
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

// Convert AdminArticle to Article format
function convertAdminArticleToArticle(adminArticle) {
  return {
    id: adminArticle.id,
    slug: adminArticle.slug,
    headline: adminArticle.headline,
    dek: adminArticle.dek || '',
    body: adminArticle.body,
    image: adminArticle.image || '',
    images: adminArticle.images || [],
    imageCaption: adminArticle.imageCaption || '',
    section: adminArticle.section,
    author: {
      id: adminArticle.author.id,
      name: adminArticle.author.name,
      role: adminArticle.author.role || 'Student Journalist',
      bio: adminArticle.author.bio || '',
      image: adminArticle.author.image || '',
      email: adminArticle.author.email,
      twitter: adminArticle.author.twitter,
    },
    publishedAt: adminArticle.publishedAt, // Keep as ISO string, seedData.ts will convert
    updatedAt: adminArticle.updatedAt,
    readingTime: adminArticle.readingTime || 1,
    tags: adminArticle.tags || [],
  };
}

// Convert AdminAuthor to Author format
function convertAdminAuthorToAuthor(adminAuthor) {
  return {
    id: adminAuthor.id,
    name: adminAuthor.name,
    role: adminAuthor.role || 'Student Journalist',
    bio: adminAuthor.bio || '',
    image: adminAuthor.image || '',
    email: adminAuthor.email,
    twitter: adminAuthor.twitter,
  };
}

// Get all articles from export (only published ones)
const exportArticles = Object.values(exportData.articles || {})
  .filter(a => a.status === 'published')
  .map(convertAdminArticleToArticle);

// Get all authors from export
const exportAuthors = Object.values(exportData.authors || {})
  .map(convertAdminAuthorToAuthor);

// Merge with existing seed data (export takes precedence)
const existingArticleIds = new Set((seedData.articles || []).map(a => a.id));
const existingAuthorIds = new Set((seedData.authors || []).map(a => a.id));

// Add new articles, update existing ones
const mergedArticles = [...(seedData.articles || [])];
exportArticles.forEach(article => {
  const idx = mergedArticles.findIndex(a => a.id === article.id);
  if (idx >= 0) {
    mergedArticles[idx] = article; // Update existing
  } else {
    mergedArticles.push(article); // Add new
  }
});

// Add new authors, update existing ones
const mergedAuthors = [...(seedData.authors || [])];
exportAuthors.forEach(author => {
  const idx = mergedAuthors.findIndex(a => a.id === author.id);
  if (idx >= 0) {
    mergedAuthors[idx] = author; // Update existing
  } else {
    mergedAuthors.push(author); // Add new
  }
});

// Update seed data
const updatedSeedData = {
  sections: seedData.sections || [],
  authors: mergedAuthors,
  articles: mergedArticles,
};

console.log(`✅ Converted ${exportArticles.length} articles and ${exportAuthors.length} authors`);
console.log(`📝 Total in seed: ${mergedArticles.length} articles, ${mergedAuthors.length} authors`);

// Write updated seed data
fs.writeFileSync(seedDataPath, JSON.stringify(updatedSeedData, null, 2));
console.log('✅ Updated octagonData.json with all stories!');
console.log('🚀 All stories are now hardcoded in the code - they will always be available!');
