/**
 * Bulk import prepared stories into Supabase.
 *
 * Usage:
 *   npm run upload:import -- scripts/story-upload-prepared.json
 *   npm run upload:import -- scripts/story-upload-prepared.json --dry-run
 *   npm run upload:import -- scripts/story-upload-prepared.json --sync-r2
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_PREPARED = 'scripts/story-upload-prepared.json';

function parseArgs(argv) {
  const args = {
    preparedPath: DEFAULT_PREPARED,
    dryRun: false,
    syncR2: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--sync-r2') args.syncR2 = true;
    else if (!arg.startsWith('--')) args.preparedPath = arg;
  }

  return args;
}

function getSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
  return { url, anonKey };
}

function toDbArticle(article) {
  return {
    id: article.id,
    slug: article.slug,
    headline: article.headline,
    dek: article.dek || '',
    body: article.body || '',
    image: article.image || '',
    images: article.images || [],
    image_caption: article.imageCaption || '',
    section: article.section,
    author_id: article.author.id,
    author_name: article.author.name,
    published_at: article.publishedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reading_time: article.readingTime || 1,
    tags: article.tags || [],
    status: article.status || 'draft',
    priority: article.priority || 'normal',
    featured: Boolean(article.featured),
    assigned_to_id: article.assignedToId,
    assigned_to_name: article.assignedToName,
    assigned_by_id: article.assignedById,
    reviewed_by_id: article.reviewedById,
    deadline: article.deadline,
    pitch_summary: article.pitchSummary,
    meta_title: article.metaTitle,
    meta_description: article.metaDescription,
    og_image: article.ogImage,
    canonical_url: article.canonicalUrl,
    internal_notes: article.internalNotes || [],
    revisions: article.revisions || [],
    word_count: article.wordCount,
    is_cinematic: Boolean(article.isCinematic),
  };
}

function toDbAuthor(author) {
  return {
    id: author.id,
    name: author.name,
    role: author.role || 'Student Journalist',
    bio: author.bio || '',
    image: author.image || '',
    email: author.email,
    twitter: author.twitter,
    updated_at: new Date().toISOString(),
  };
}

async function fetchExistingSlugMap(supabase) {
  const { data, error } = await supabase
    .from('articles')
    .select('id,slug');
  if (error) throw error;
  return new Map((data || []).map(row => [row.slug, row.id]));
}

function withCollisionSafeSlugs(articles, existingSlugs) {
  const reserved = new Set(existingSlugs.keys());
  return articles.map(article => {
    if (!reserved.has(article.slug) || existingSlugs.get(article.slug) === article.id) {
      reserved.add(article.slug);
      return article;
    }

    const base = article.slug || 'untitled-story';
    let suffix = 2;
    let slug = `${base}-${suffix}`;
    while (reserved.has(slug)) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    reserved.add(slug);
    return { ...article, slug, id: `upload_${slug}` };
  });
}

async function importPreparedStories(options) {
  const prepared = JSON.parse(readFileSync(options.preparedPath, 'utf8'));
  const articles = prepared.articles || [];
  const authors = Object.values(prepared.authors || {});

  if (articles.length === 0) {
    console.log('No resolved articles to import. Source exports are still unresolved.');
    console.log(`Unresolved sources: ${(prepared.unresolved || []).length}`);
    return { authors: 0, articles: 0, skipped: prepared.unresolved || [] };
  }

  if (options.dryRun) {
    console.log(`Dry run: would import ${authors.length} authors and ${articles.length} articles.`);
    console.log(`Published: ${articles.filter(article => article.status === 'published').length}`);
    console.log(`Draft: ${articles.filter(article => article.status === 'draft').length}`);
    return { authors: authors.length, articles: articles.length, skipped: prepared.unresolved || [] };
  }

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createClient(url, anonKey);
  const collisionSafeArticles = withCollisionSafeSlugs(articles, await fetchExistingSlugMap(supabase));

  let savedAuthors = 0;
  for (const author of authors) {
    const { error } = await supabase
      .from('authors')
      .upsert(toDbAuthor(author), { onConflict: 'id' });
    if (error) throw error;
    savedAuthors += 1;
  }

  let savedArticles = 0;
  for (const article of collisionSafeArticles) {
    const { error } = await supabase
      .from('articles')
      .upsert(toDbArticle(article), { onConflict: 'id' });
    if (error) throw error;
    savedArticles += 1;
  }

  if (options.syncR2) {
    const { publishArticlesToR2 } = await import('./publishArticlesToR2.mjs');
    await publishArticlesToR2();
  }

  return {
    authors: savedAuthors,
    articles: savedArticles,
    published: collisionSafeArticles.filter(article => article.status === 'published').length,
    draft: collisionSafeArticles.filter(article => article.status === 'draft').length,
    skipped: prepared.unresolved || [],
  };
}

const options = parseArgs(process.argv.slice(2));

importPreparedStories(options).then(result => {
  console.log(`Imported ${result.articles} articles and ${result.authors} authors.`);
  if (typeof result.published === 'number') console.log(`Published: ${result.published}`);
  if (typeof result.draft === 'number') console.log(`Draft: ${result.draft}`);
  if (result.skipped?.length) console.log(`Skipped unresolved sources: ${result.skipped.length}`);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
