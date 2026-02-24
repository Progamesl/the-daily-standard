const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const xmlFilePath = 'C:\\Users\\siddh\\Downloads\\theoctagon.WordPress.2025-11-02.xml';
const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
  parseTrueNumberOnly: true,
  arrayMode: false,
});

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
      bio: 'Student journalist at Sacramento Country Day School',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(author['wp:author_display_name'] || author['wp:author_login'])}&size=200`,
      email: author['wp:author_email'] || '',
    };
  });
}

const categoryToSection = {
  'news': 'us', 'arts-entertainment': 'arts', 'arts': 'arts', 'sports': 'sports',
  'opinion': 'opinion', 'features': 'us', 'books': 'arts', 'movies-tv': 'arts',
  'music': 'arts', 'media': 'arts', 'games-apps': 'technology', 'food-service': 'us',
  'science': 'science', 'health': 'health', 'covid-19': 'health',
};

function mapCategoryToSection(categories) {
  if (!categories || categories.length === 0) return 'us';
  const cats = Array.isArray(categories) ? categories : [categories];
  for (const cat of cats) {
    const catSlug = typeof cat === 'string' ? cat : cat['@_nicename'] || cat['#text'];
    if (categoryToSection[catSlug]) return categoryToSection[catSlug];
  }
  return 'us';
}

function isPublicationImage(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return u.includes('saccdsoctagon.org') || u.includes('octagon.scdsstudent.org');
}

// ── Build attachment map from wp:attachment items ──
const attachmentIdToUrl = {};
if (channel.item) {
  const allItems = Array.isArray(channel.item) ? channel.item : [channel.item];
  allItems.forEach((item) => {
    if (item['wp:post_type'] !== 'attachment') return;
    const id = item['wp:post_id']?.['#text'] ?? item['wp:post_id'];
    const url = item['wp:attachment_url']?.['#text'] ?? item['wp:attachment_url'];
    if (id != null && url && isPublicationImage(url)) {
      attachmentIdToUrl[String(id)] = url;
    }
  });
}
console.log(`Built attachment map: ${Object.keys(attachmentIdToUrl).length} publication images`);

function getThumbnailId(item) {
  const meta = item['wp:postmeta'];
  if (!meta) return null;
  const list = Array.isArray(meta) ? meta : [meta];
  for (const m of list) {
    const key = m['wp:meta_key']?.['#text'] ?? m['wp:meta_key'];
    if (key === '_thumbnail_id') {
      const val = m['wp:meta_value']?.['#text'] ?? m['wp:meta_value'];
      return val != null ? String(val) : null;
    }
  }
  return null;
}

// ── Extract articles ──
const articles = [];
if (channel.item) {
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];

  items.forEach((item, index) => {
    if (item['wp:post_type'] !== 'post' || item['wp:status'] !== 'publish') return;

    const title = item.title?.['#text'] || item.title || 'Untitled';
    let content = item['content:encoded']?.['#text'] || item['content:encoded'] || item.description?.['#text'] || item.description || '';
    const excerpt = item['excerpt:encoded']?.['#text'] || item['excerpt:encoded'] || '';

    content = content.replace(/<!--[\s\S]*?-->/g, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/\s*class=["'][^"']*wp-[^"']*["']/gi, '');
    content = content.replace(/\s*data-[^=]*=["'][^"']*["']/gi, '');
    content = content.replace(/<div[^>]*>/gi, '<p>');
    content = content.replace(/<\/div>/gi, '</p>');
    content = content.replace(/<p>\s*<\/p>/gi, '');
    content = content.replace(/<p><\/p>/gi, '');
    content = content.replace(/<br\s*\/?>/gi, ' ');
    content = content.replace(/<figure[^>]*class=["'][^"']*wp-[^"']*["'][^>]*>/gi, '<figure>');
    content = content.replace(/<figcaption[^>]*class=["'][^"']*wp-[^"']*["'][^>]*>/gi, '<figcaption>');
    content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');
    content = content.replace(/^\s+|\s+$/gm, '');
    content = content.trim();

    const itemCategories = [];
    if (item.category) {
      const cats = Array.isArray(item.category) ? item.category : [item.category];
      cats.forEach(cat => {
        const catName = typeof cat === 'string' ? cat : cat['@_nicename'] || cat['#text'];
        if (catName && catName !== 'Uncategorized') itemCategories.push(catName);
      });
    }

    const creator = item['dc:creator']?.['#text'] || item['dc:creator'] || 'Staff';
    const authorId = Object.keys(authorsMap).find(id =>
      authorsMap[id].name === creator || authorsMap[id].email.includes(creator.toLowerCase())
    );
    const author = authorId ? authorsMap[authorId] : {
      id: 'staff', name: creator || 'Staff', role: 'Student Journalist',
      bio: 'Student journalist at Sacramento Country Day School',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(creator || 'Staff')}&size=200`,
    };

    const pubDate = item.pubDate?.['#text'] || item.pubDate || new Date().toISOString();
    const publishedAt = new Date(pubDate);
    const slug = item['wp:post_name']?.['#text'] || item['wp:post_name'] ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // All images from body
    const bodyImages = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(content)) !== null) {
      bodyImages.push(imgMatch[1]);
    }

    // Primary image: 1) WordPress featured image (_thumbnail_id), 2) first publication image from body, 3) first any image from body
    let image = '';
    const thumbId = getThumbnailId(item);
    if (thumbId && attachmentIdToUrl[thumbId]) {
      image = attachmentIdToUrl[thumbId];
    }
    if (!image) {
      const firstPub = bodyImages.find(src => isPublicationImage(src));
      if (firstPub) image = firstPub;
    }
    if (!image && bodyImages.length > 0) {
      image = bodyImages[0];
    }
    if (image) {
      image = image.replace(/\?w=\d+.*$/, '').replace(/\?resize=.*$/, '');
    }

    // Collect all images (dedupe)
    const seen = new Set();
    const articleImages = [];
    if (image) { articleImages.push(image); seen.add(image); }
    bodyImages.forEach(src => {
      const clean = src.replace(/\?w=\d+.*$/, '').replace(/\?resize=.*$/, '');
      if (!seen.has(clean)) { seen.add(clean); articleImages.push(clean); }
    });

    const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    const tags = itemCategories.slice(0, 5);
    const cleanExcerpt = excerpt.replace(/<[^>]+>/g, '').trim() ||
      content.replace(/<[^>]+>/g, '').substring(0, 150).trim() + '...';

    articles.push({
      id: item['wp:post_id']?.['#text'] || item['wp:post_id'] || `article-${index + 1}`,
      slug, headline: title, dek: cleanExcerpt, body: content,
      image, images: articleImages, imageCaption: '',
      section: mapCategoryToSection(itemCategories),
      author, publishedAt, readingTime, tags,
      isBreaking: false,
      isFeatured: index < 3,
      views: Math.floor(Math.random() * 100000) + 1000,
    });
  });
}

articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

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
  articles,
};

const jsonStr = JSON.stringify(output, null, 2);
const srcPath = path.join(__dirname, '../src/data/octagonData.json');
const pubPath = path.join(__dirname, '../public/octagonData.json');
fs.writeFileSync(srcPath, jsonStr);
fs.writeFileSync(pubPath, jsonStr);

const withImg = articles.filter(a => a.image && a.image.length > 0).length;
const pubImg = articles.filter(a => isPublicationImage(a.image)).length;
console.log(`Parsed ${articles.length} articles (${withImg} with image, ${pubImg} from publication)`);
console.log(`Found ${Object.keys(authorsMap).length} authors`);
console.log(`Output written to ${srcPath} and ${pubPath}`);
