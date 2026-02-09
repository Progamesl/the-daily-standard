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
    let content = item['content:encoded']?.['#text'] || item['content:encoded'] || item.description?.['#text'] || item.description || '';
    const excerpt = item['excerpt:encoded']?.['#text'] || item['excerpt:encoded'] || '';
    
    // Remove ALL WordPress comments (including wp:paragraph, wp:html, etc.)
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove style and script tags completely
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove WordPress-specific attributes and classes
    content = content.replace(/\s*class=["'][^"']*wp-[^"']*["']/gi, '');
    content = content.replace(/\s*data-[^=]*=["'][^"']*["']/gi, '');
    
    // Clean up HTML - preserve paragraphs, headings, links, lists, but clean everything else
    // Convert divs to paragraphs if they contain text
    content = content.replace(/<div[^>]*>/gi, '<p>');
    content = content.replace(/<\/div>/gi, '</p>');
    
    // Remove empty paragraphs
    content = content.replace(/<p>\s*<\/p>/gi, '');
    content = content.replace(/<p><\/p>/gi, '');
    
    // Clean up line breaks - convert <br> to spaces within paragraphs
    content = content.replace(/<br\s*\/?>/gi, ' ');
    
    // Remove any remaining WordPress-specific elements
    content = content.replace(/<figure[^>]*class=["'][^"']*wp-[^"']*["'][^>]*>/gi, '<figure>');
    content = content.replace(/<figcaption[^>]*class=["'][^"']*wp-[^"']*["'][^>]*>/gi, '<figcaption>');
    
    // Clean up extra whitespace
    content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');
    content = content.replace(/^\s+|\s+$/gm, ''); // Trim each line
    content = content.trim();
    
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

    // Extract ALL images from content
    const images = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(content)) !== null) {
      images.push(imgMatch[1]);
    }
    
    // Extract primary image - prefer real images from content
    let image = '';
    if (images.length > 0) {
      // Use first real image from content
      image = images[0];
      // Clean up WordPress image URLs
      image = image.replace(/\\?w=\d+.*$/, ''); // Remove size params
      image = image.replace(/\\?resize=.*$/, '');
    }
    
    // If no good image found, use section-based Unsplash fallback
    if (!image || image.includes('placeholder') || image.includes('wayback')) {
      const sectionSlug = mapCategoryToSection(itemCategories);
      const unsplashKeywords = {
        'us': 'photo-1585829365295-ab7cd400c167',
        'world': 'photo-1451187580459-43490279c0fa',
        'politics': 'photo-1529107386315-e1a2ed48a620',
        'business': 'photo-1611974789855-9c2a0a7236a3',
        'technology': 'photo-1677442136019-21780ecad995',
        'science': 'photo-1532094349884-543bc11b234d',
        'health': 'photo-1579154204601-01588f351e67',
        'sports': 'photo-1546519638-68e109498ffc',
        'arts': 'photo-1507676184212-d03ab07a01bf',
        'opinion': 'photo-1529107386315-e1a2ed48a620',
      };
      const photoId = unsplashKeywords[sectionSlug] || 'photo-1504711434969-e33886168f5c';
      image = `https://images.unsplash.com/${photoId}?w=1200&h=800&fit=crop&auto=format&q=80`;
    }
    
    // Store all images for the article
    const articleImages = images.length > 0 ? images : [image];

    // Calculate reading time (average 200 words per minute)
    const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Extract tags
    const tags = itemCategories.slice(0, 5);

    // Clean excerpt for dek
    const cleanExcerpt = excerpt.replace(/<[^>]+>/g, '').trim() || 
      content.replace(/<[^>]+>/g, '').substring(0, 150).trim() + '...';
    
    articles.push({
      id: item['wp:post_id']?.['#text'] || item['wp:post_id'] || `article-${index + 1}`,
      slug: slug,
      headline: title,
      dek: cleanExcerpt,
      body: content,
      image: image,
      images: articleImages, // Store all images
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
