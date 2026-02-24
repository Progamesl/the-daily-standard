const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

// Read the XML file
const xmlFilePath = 'C:\\Users\\siddh\\Downloads\\theoctagon.WordPress.2025-11-02.xml';
const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');

// Configure parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
  parseTrueNumberOnly: true,
  arrayMode: false,
});

// Parse XML
const result = parser.parse(xmlContent);
const channel = result.rss.channel;

// Extract categories
const categories = {};
if (channel['wp:category']) {
  const cats = Array.isArray(channel['wp:category']) ? channel['wp:category'] : [channel['wp:category']];
  cats.forEach(cat => {
    if (cat['wp:cat_name']) {
      categories[cat['wp:category_nicename']] = cat['wp:cat_name'];
    }
  });
}

// Extract authors
const authorsMap = {};
if (channel['wp:author']) {
  const authors = Array.isArray(channel['wp:author']) ? channel['wp:author'] : [channel['wp:author']];
  authors.forEach(author => {
    const id = author['wp:author_id'];
    authorsMap[id] = {
      id: id.toString(),
      name: author['wp:author_display_name'] || author['wp:author_login'] || 'Unknown',
      role: 'Student Journalist',
      bio: `Student journalist at Sacramento Country Day School`,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(author['wp:author_display_name'] || author['wp:author_login'])}&size=200`,
      email: author['wp:author_email'] || '',
    };
  });
}

// Category mapping to sections
const categoryToSection = {
  'news': 'us',
  'arts-entertainment': 'arts',
  'arts': 'arts',
  'sports': 'sports',
  'opinion': 'opinion',
  'features': 'us',
  'books': 'arts',
  'movies-tv': 'arts',
  'music': 'arts',
  'media': 'arts',
  'games-apps': 'technology',
  'food-service': 'us',
  'science': 'science',
  'health': 'health',
  'covid-19': 'health',
};

// Helper function to map category to section
function mapCategoryToSection(categories) {
  if (!categories || categories.length === 0) return 'us';
  
  const cats = Array.isArray(categories) ? categories : [categories];
  for (const cat of cats) {
    const catSlug = typeof cat === 'string' ? cat : cat['@_nicename'] || cat['#text'];
    if (categoryToSection[catSlug]) {
      return categoryToSection[catSlug];
    }
  }
  return 'us'; // default
}

// Extract articles
const articles = [];
if (channel.item) {
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  
  items.forEach((item, index) => {
    // Skip if it's a page or draft
    if (item['wp:post_type'] !== 'post' || item['wp:status'] !== 'publish') {
      return;
    }

    const title = item.title?.['#text'] || item.title || 'Untitled';
    const content = item['content:encoded']?.['#text'] || item['content:encoded'] || item.description?.['#text'] || item.description || '';
    const excerpt = item['excerpt:encoded']?.['#text'] || item['excerpt:encoded'] || '';
    
    // Extract categories
    const itemCategories = [];
    if (item.category) {
      const cats = Array.isArray(item.category) ? item.category : [item.category];
      cats.forEach(cat => {
        const catName = typeof cat === 'string' ? cat : cat['@_nicename'] || cat['#text'];
        if (catName && catName !== 'Uncategorized') {
          itemCategories.push(catName);
        }
      });
    }

    // Get author
    const creator = item['dc:creator']?.['#text'] || item['dc:creator'] || 'Staff';
    const authorId = Object.keys(authorsMap).find(id => 
      authorsMap[id].name === creator || authorsMap[id].email.includes(creator.toLowerCase())
    );
    const author = authorId ? authorsMap[authorId] : {
      id: 'staff',
      name: creator || 'Staff',
      role: 'Student Journalist',
      bio: 'Student journalist at Sacramento Country Day School',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(creator || 'Staff')}&size=200`,
    };

    // Parse date
    const pubDate = item.pubDate?.['#text'] || item.pubDate || new Date().toISOString();
    const publishedAt = new Date(pubDate);

    // Create slug from title
    const slug = item['wp:post_name']?.['#text'] || item['wp:post_name'] || 
      title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Extract image from content or use placeholder
    let image = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=800&fit=crop';
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      image = imgMatch[1];
    }

    // Calculate reading time (average 200 words per minute)
    const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Extract tags
    const tags = itemCategories.slice(0, 5);

    articles.push({
      id: item['wp:post_id']?.['#text'] || item['wp:post_id'] || `article-${index + 1}`,
      slug: slug,
      headline: title,
      dek: excerpt || content.substring(0, 150).replace(/<[^>]+>/g, '') + '...',
      body: content,
      image: image,
      imageCaption: '',
      section: mapCategoryToSection(itemCategories),
      author: author,
      publishedAt: publishedAt,
      readingTime: readingTime,
      tags: tags,
      isBreaking: false,
      isFeatured: index < 3, // First 3 articles are featured
      views: Math.floor(Math.random() * 100000) + 1000,
    });
  });
}

// Sort articles by date (newest first)
articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

// Create output
const output = {
  sections: [
    { id: "world", name: "World", slug: "world", description: "International news and global affairs" },
    { id: "us", name: "U.S.", slug: "us", description: "National and school news" },
    { id: "politics", name: "Politics", slug: "politics", description: "Political news and analysis" },
    { id: "business", name: "Business", slug: "business", description: "Markets, economy, and corporate news" },
    { id: "technology", name: "Technology", slug: "technology", description: "Tech industry and innovation" },
    { id: "science", name: "Science", slug: "science", description: "Scientific discoveries and research" },
    { id: "health", name: "Health", slug: "health", description: "Medical news and wellness" },
    { id: "sports", name: "Sports", slug: "sports", description: "Sports news and analysis" },
    { id: "arts", name: "Arts", slug: "arts", description: "Culture, entertainment, and the arts" },
    { id: "opinion", name: "Opinion", slug: "opinion", description: "Editorials and op-eds" },
  ],
  authors: Object.values(authorsMap),
  articles: articles,
};

// Write to file
const outputPath = path.join(__dirname, '../src/data/octagonData.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Parsed ${articles.length} articles`);
console.log(`Found ${Object.keys(authorsMap).length} authors`);
console.log(`Output written to ${outputPath}`);
