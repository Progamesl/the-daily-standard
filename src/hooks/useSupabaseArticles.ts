/**
 * useSupabaseArticles Hook
 * 
 * HEADLESS CMS PATTERN: Supabase is the single source of truth.
 * This hook ensures all pages get fresh data from Supabase automatically.
 */

import { useState, useEffect } from 'react';
import { getArticlesFromSupabase } from '@/lib/supabaseDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { getStorage, ARTICLES_KEY } from '@/lib/adminDataService';
import type { AdminArticle } from '@/lib/adminDataService';

interface UseSupabaseArticlesResult {
  articles: Record<string, AdminArticle>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Global cache to share across all hook instances
let globalArticlesCache: Record<string, AdminArticle> | null = null;
let globalCacheTime = 0;
let globalLoadingPromise: Promise<Record<string, AdminArticle>> | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

async function fetchArticlesFromSupabase(): Promise<Record<string, AdminArticle>> {
  // If already loading, return the same promise
  if (globalLoadingPromise) {
    return globalLoadingPromise;
  }

  // Check cache
  const now = Date.now();
  if (globalArticlesCache && (now - globalCacheTime) < CACHE_TTL) {
    return globalArticlesCache;
  }

  // Start loading
  globalLoadingPromise = (async () => {
    try {
      if (!isSupabaseConfigured()) {
        // Fallback to localStorage if Supabase not configured
        return getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
      }

      console.log('🔄 Fetching articles from Supabase (HEADLESS CMS)...');
      const supabaseArticles = await getArticlesFromSupabase();
      const count = Object.keys(supabaseArticles).length;
      console.log(`✅ Loaded ${count} articles from Supabase`);

      // Update localStorage cache
      try {
        const localArticles = getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
        // Supabase is source of truth - overwrite localStorage
        const merged = { ...supabaseArticles };
        Object.keys(localArticles).forEach(id => {
          if (!merged[id]) {
            merged[id] = localArticles[id]; // Only add local-only articles
          }
        });
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn('Failed to update localStorage cache:', e);
      }

      globalArticlesCache = supabaseArticles;
      globalCacheTime = now;
      return supabaseArticles;
    } finally {
      globalLoadingPromise = null;
    }
  })();

  return globalLoadingPromise;
}

export function useSupabaseArticles(): UseSupabaseArticlesResult {
  const [articles, setArticles] = useState<Record<string, AdminArticle>>(() => {
    // Initial state: try localStorage cache (for instant render)
    try {
      return getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
    } catch {
      return {};
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchArticlesFromSupabase();
      setArticles(fetched);
      // Invalidate global cache to force fresh fetch next time
      globalArticlesCache = null;
      globalCacheTime = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch articles');
      setError(error);
      console.error('❌ Error fetching articles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // On mount, fetch from Supabase (single source of truth)
    fetchArticlesFromSupabase()
      .then(fetched => {
        setArticles(fetched);
        setIsLoading(false);
      })
      .catch(err => {
        const error = err instanceof Error ? err : new Error('Failed to fetch articles');
        setError(error);
        setIsLoading(false);
        console.error('❌ Error fetching articles on mount:', error);
      });

    // Listen for article saves to trigger immediate refetch
    const handleArticleSaved = () => {
      console.log('📢 Article saved - refetching from Supabase...');
      refetch();
    };
    window.addEventListener('supabase-article-saved', handleArticleSaved);
    return () => window.removeEventListener('supabase-article-saved', handleArticleSaved);
  }, []);

  return { articles, isLoading, error, refetch };
}

// Invalidate cache when articles are saved/deleted
export function invalidateSupabaseCache() {
  globalArticlesCache = null;
  globalCacheTime = 0;
  globalLoadingPromise = null;
}
