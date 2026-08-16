/**
 * Supabase Data Service
 * 
 * This service provides Supabase-backed data operations.
 * Falls back to localStorage if Supabase is not configured.
 * 
 * To enable:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 * 3. Run migrations.sql in Supabase SQL Editor
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type { AdminArticle, AdminAuthor } from './adminDataService';

/**
 * Returns the SHARED Supabase client singleton from supabaseClient.ts.
 *
 * This module used to call createClient() itself, which produced a second,
 * independent client. Because ten call sites race on `await initSupabase()`,
 * that spawned ~11 GoTrueClient instances all sharing one auth storage key
 * ("Multiple GoTrueClient instances detected" + undefined auth behaviour).
 *
 * Critically, article reads/writes then ran on a DIFFERENT client than the one
 * src/lib/auth.ts signs in on — so once RLS requires an authenticated role,
 * those writes could fail. Everything must share one authenticated client.
 */
async function initSupabase() {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase not configured: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    return null;
  }
  return getSupabaseClient();
}

// List-only: minimal columns for table/search (saves significant egress).
//
// `image` and `deadline` are here because several admin screens have to answer
// questions about a story without opening it — whether it has a picture (one
// without can never lead a section) and whether it is overdue. Both were
// missing, so every story loaded from the server looked like it had no picture
// and no deadline. The body is still deliberately absent; it is fetched per
// story when one is opened.
const ARTICLES_LIST_COLUMNS =
  'id, slug, headline, dek, image, section, author_id, author_name, published_at, updated_at, status, priority, featured, assigned_to_id, deadline';

/** A full row, notes and all — the Trash page needs who deleted it and why. */
export function rowToAdminArticleForTrash(row: unknown): AdminArticle {
  return rowToAdminArticle(row, true);
}

function rowToAdminArticle(row: any, includeBody = false): AdminArticle {
  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    dek: row.dek,
    body: includeBody ? (row.body ?? '') : '',
    image: row.image,
    images: row.images || [],
    imageCaption: row.image_caption,
    section: row.section,
    author: {
      id: row.author_id,
      name: row.author_name,
    },
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    readingTime: row.reading_time,
    tags: row.tags || [],
    status: row.status,
    priority: row.priority,
    featured: row.featured,
    isCinematic: row.is_cinematic || false,
    assignedToId: row.assigned_to_id,
    assignedToName: row.assigned_to_name,
    assignedById: row.assigned_by_id,
    reviewedById: row.reviewed_by_id,
    deadline: row.deadline,
    pitchSummary: row.pitch_summary,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    ogImage: row.og_image,
    canonicalUrl: row.canonical_url,
    internalNotes: includeBody ? (row.internal_notes || []) : [],
    revisions: includeBody ? (row.revisions || []) : [],
    wordCount: row.word_count,
  };
}

/**
 * Fetch article list from Supabase WITHOUT body/internal_notes/revisions to reduce egress.
 * Full article is loaded on demand via getArticleByIdFromSupabase or getArticleBySlugFromSupabase.
 */
export async function getArticlesFromSupabase(): Promise<Record<string, AdminArticle>> {
  const client = await initSupabase();
  if (!client) return {};
  
  try {
    console.log('📡 Fetching article list from Supabase (list-only, low egress)...');
    const { data, error } = await client
      .from('articles')
      .select(ARTICLES_LIST_COLUMNS)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }
    
    const count = data?.length || 0;
    console.log(`📥 Received ${count} articles from Supabase`);
    
    if (count === 0) {
      console.warn('⚠️ Supabase returned 0 articles. Possible causes:');
      console.warn('  1. No articles have been migrated yet');
      console.warn('  2. RLS policies are blocking access (run fix_rls_policies.sql)');
      console.warn('  3. Articles table is empty');
    }
    
    const articles: Record<string, AdminArticle> = {};
    data?.forEach((row: any) => {
      articles[row.id] = rowToAdminArticle(row, false);
    });
    
    return articles;
  } catch (error) {
    console.error('Error fetching articles from Supabase:', error);
    return {};
  }
}

/** Fetch one full article by id (for editor). Use to avoid sending body for every article. */
export async function getArticleByIdFromSupabase(id: string): Promise<AdminArticle | null> {
  const client = await initSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return rowToAdminArticle(data, true);
  } catch {
    return null;
  }
}

// Per-article body cache — avoids re-fetching on navigate-away-and-back
const articleSlugCache = new Map<string, { article: AdminArticle; fetchedAt: number }>();
const ARTICLE_BODY_CACHE_TTL = 10 * 60 * 1000; // 10 min

/** Fetch one full article by slug (for public article page). Reduces egress vs loading all bodies. */
export async function getArticleBySlugFromSupabase(
  slug: string,
  options?: { publishedOnly?: boolean }
): Promise<AdminArticle | null> {
  const cacheKey = `${slug}:${options?.publishedOnly ?? true}`;
  const cached = articleSlugCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ARTICLE_BODY_CACHE_TTL) {
    return cached.article;
  }

  const client = await initSupabase();
  if (!client) return null;
  try {
    let q = client.from('articles').select('*').eq('slug', slug);
    if (options?.publishedOnly !== false) {
      q = q.eq('status', 'published');
    }
    const { data, error } = await q.maybeSingle();
    if (error || !data) return null;
    const article = rowToAdminArticle(data, true);
    articleSlugCache.set(cacheKey, { article, fetchedAt: Date.now() });
    return article;
  } catch {
    return null;
  }
}

/** Clear article body cache (call after saving an article so editors see updated content). */
export function clearArticleBodyCache(slug?: string): void {
  if (slug) {
    articleSlugCache.forEach((_, key) => { if (key.startsWith(`${slug}:`)) articleSlugCache.delete(key); });
  } else {
    articleSlugCache.clear();
  }
}

export async function saveArticleToSupabase(article: AdminArticle, upsertBy: 'id' | 'slug' = 'id'): Promise<boolean> {
  const client = await initSupabase();
  if (!client) {
    console.warn('⚠️ Supabase client not initialized');
    return false;
  }

  try {
    console.log('💾 Saving article to Supabase:', article.id, article.headline);

    const row: Record<string, unknown> = {
      id: article.id,
      slug: article.slug,
      headline: article.headline,
      dek: article.dek,
      body: article.body,
      image: article.image,
      images: article.images || [],
      image_caption: article.imageCaption,
      section: article.section,
      author_id: article.author.id,
      author_name: article.author.name,
      published_at: article.publishedAt,
      updated_at: new Date().toISOString(),
      reading_time: article.readingTime,
      tags: article.tags || [],
      status: article.status,
      priority: article.priority,
      featured: article.featured || false,
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
      is_cinematic: article.isCinematic || false,
    };

    // Never let a partial copy of a story overwrite the whole story.
    //
    // Article lists are loaded with a short column set — no body, no gallery,
    // no tags, no notes, no revision history — because the body is fetched
    // separately when a story is actually opened. Anything that saves a
    // list-loaded article therefore arrives here with all of that empty, and
    // this is a full upsert of every column, so it would write the emptiness
    // in. Moving a story to the trash would have erased its text, pictures,
    // tags and history, and restoring it would have handed back a blank page.
    //
    // An empty body is the reliable tell, because no screen that has the body
    // is missing the rest. In that case the stored row is read and anything
    // this save did not carry is kept.
    if (!article.body) {
      const { data: stored } = await client
        .from('articles').select('*').eq('id', article.id).maybeSingle();
      const prev = stored as Record<string, unknown> | null;
      if (prev) {
        const isEmpty = (v: unknown) =>
          v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        for (const key of Object.keys(row)) {
          // status and updated_at are what this save is actually changing.
          if (key === 'status' || key === 'updated_at') continue;
          if (isEmpty(row[key]) && !isEmpty(prev[key])) row[key] = prev[key];
        }
        console.warn('Filled in from the stored story — this save was a partial copy:', article.id);
      }
    }

    const { error } = await client
      .from('articles')
      .upsert(row as never, { onConflict: upsertBy });


    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    console.log('✅ Article saved to Supabase successfully');
    clearArticleBodyCache(article.slug); // Bust cache so editors see updates immediately
    return true;
  } catch (error) {
    console.error('❌ Error saving article to Supabase:', error);
    return false;
  }
}

export async function deleteArticleFromSupabase(articleId: string): Promise<boolean> {
  const client = await initSupabase();
  if (!client) {
    console.warn('⚠️ Supabase client not initialized');
    return false;
  }
  
  try {
    console.log('🗑️ Deleting article from Supabase:', articleId);
    const { error } = await client
      .from('articles')
      .delete()
      .eq('id', articleId);
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    console.log('✅ Article deleted from Supabase successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting article from Supabase:', error);
    return false;
  }
}

// ─── Authors ─────────────────────────────────────────────────────────────────
export async function getAuthorsFromSupabase(): Promise<Record<string, AdminAuthor>> {
  const client = await initSupabase();
  if (!client) return {};
  
  try {
    const { data, error } = await client
      .from('authors')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    const authors: Record<string, AdminAuthor> = {};
    data?.forEach((row: any) => {
      authors[row.id] = {
        id: row.id,
        name: row.name,
        role: row.role,
        bio: row.bio,
        image: row.image,
        email: row.email,
        twitter: row.twitter,
        // Absent until 06_staff_masthead.sql has been run.
        onMasthead: row.on_masthead === true,
        primarySection: row.primary_section ?? undefined,
        altSections: Array.isArray(row.alt_sections) ? row.alt_sections : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
        sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
      };
    });

    return authors;
  } catch (error) {
    console.error('Error fetching authors from Supabase:', error);
    return {};
  }
}

export async function saveAuthorToSupabase(author: AdminAuthor): Promise<boolean> {
  const client = await initSupabase();
  if (!client) return false;

  const core = {
    id: author.id,
    name: author.name,
    role: author.role,
    bio: author.bio,
    image: author.image,
    email: author.email,
    twitter: author.twitter,
    updated_at: new Date().toISOString(),
  };

  const withMasthead = {
    ...core,
    on_masthead: author.onMasthead ?? false,
    primary_section: author.primarySection ?? null,
    alt_sections: author.altSections ?? [],
    tags: author.tags ?? [],
    sort_order: author.sortOrder ?? 0,
  };

  try {
    const { error } = await client
      .from('authors')
      .upsert(withMasthead as never, { onConflict: 'id' });

    if (!error) return true;

    // The masthead columns only exist once 06_staff_masthead.sql has been run.
    // Until then the whole upsert would be rejected and an editor would lose an
    // ordinary bio edit for the sake of a column nobody has added yet, so fall
    // back to saving the person without their masthead fields.
    if (/column|schema cache/i.test(error.message)) {
      console.warn('Masthead columns not present yet — saving the author without them.');
      const { error: retryError } = await client
        .from('authors')
        .upsert(core as never, { onConflict: 'id' });
      if (retryError) throw retryError;
      return true;
    }

    throw error;
  } catch (error) {
    console.error('Error saving author to Supabase:', error);
    return false;
  }
}

export async function deleteAuthorFromSupabase(authorId: string): Promise<boolean> {
  const client = await initSupabase();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('authors')
      .delete()
      .eq('id', authorId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting author from Supabase:', error);
    return false;
  }
}

// ─── Migration Helper ───────────────────────────────────────────────────────
export async function migrateLocalStorageToSupabase(): Promise<{ success: boolean; articles: number; authors: number; error?: string }> {
  const client = await initSupabase();
  if (!client) {
    return { success: false, articles: 0, authors: 0, error: 'Supabase not configured' };
  }
  
  try {
    // Get data from localStorage
    const articlesJson = localStorage.getItem('octagon_admin_articles');
    const authorsJson = localStorage.getItem('octagon_admin_authors');
    
    const articles = articlesJson ? JSON.parse(articlesJson) : {};
    const authors = authorsJson ? JSON.parse(authorsJson) : {};
    
    let articlesCount = 0;
    let authorsCount = 0;
    
    // Migrate articles
    for (const article of Object.values(articles) as AdminArticle[]) {
      if (await saveArticleToSupabase(article)) {
        articlesCount++;
      }
    }
    
    // Migrate authors
    for (const author of Object.values(authors) as AdminAuthor[]) {
      if (await saveAuthorToSupabase(author)) {
        authorsCount++;
      }
    }
    
    return { success: true, articles: articlesCount, authors: authorsCount };
  } catch (error) {
    return { 
      success: false, 
      articles: 0, 
      authors: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
