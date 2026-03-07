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

let supabase: any = null;

async function initSupabase() {
  if (supabase) return supabase;
  if (!isSupabaseConfigured()) return null;
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      supabase = createClient(url, anonKey);
      return supabase;
    }
  } catch (error) {
    console.warn('Supabase not available:', error);
  }
  return null;
}

// ─── Articles ────────────────────────────────────────────────────────────────
export async function getArticlesFromSupabase(): Promise<Record<string, AdminArticle>> {
  const client = await initSupabase();
  if (!client) return {};
  
  try {
    const { data, error } = await client
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const articles: Record<string, AdminArticle> = {};
    data?.forEach((row: any) => {
      articles[row.id] = {
        id: row.id,
        slug: row.slug,
        headline: row.headline,
        dek: row.dek,
        body: row.body,
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
        internalNotes: row.internal_notes || [],
        revisions: row.revisions || [],
        wordCount: row.word_count,
      };
    });
    
    return articles;
  } catch (error) {
    console.error('Error fetching articles from Supabase:', error);
    return {};
  }
}

export async function saveArticleToSupabase(article: AdminArticle): Promise<boolean> {
  const client = await initSupabase();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('articles')
      .upsert({
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
        updated_at: article.updatedAt || new Date().toISOString(),
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
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving article to Supabase:', error);
    return false;
  }
}

export async function deleteArticleFromSupabase(articleId: string): Promise<boolean> {
  const client = await initSupabase();
  if (!client) return false;
  
  try {
    const { error } = await client
      .from('articles')
      .delete()
      .eq('id', articleId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting article from Supabase:', error);
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
  
  try {
    const { error } = await client
      .from('authors')
      .upsert({
        id: author.id,
        name: author.name,
        role: author.role,
        bio: author.bio,
        image: author.image,
        email: author.email,
        twitter: author.twitter,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    
    if (error) throw error;
    return true;
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
