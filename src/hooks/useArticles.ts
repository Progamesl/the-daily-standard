/**
 * useArticles Hook
 * 
 * Production-grade data fetching: Supabase is PRIMARY source of truth.
 * localStorage is just a cache for performance/offline support.
 * 
 * This is how NYTimes/WordPress work - database-first, cache-second.
 */

import { useState, useEffect } from 'react';
import { getArticlesFromSupabase } from '@/lib/supabaseDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { getStorage, ARTICLES_KEY } from '@/lib/adminDataService';
import type { AdminArticle } from '@/lib/adminDataService';

interface UseArticlesResult {
  articles: Record<string, AdminArticle>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let globalCache: Record<string, AdminArticle> | null = null;
let globalCacheTime = 0;
let globalLoadingPromise: Promise<Record<string, AdminArticle>> | null = null;

async function fetchArticlesFromSupabase(): Promise<Record<string, AdminArticle>> {
  // If already loading, return the same promise
  if (globalLoadingPromise) {
    return globalLoadingPromise;
  }

  // Check cache
  const now = Date.now();
  if (globalCache && (now - globalCacheTime) < CACHE_TTL) {
    console.log('📦 Using cached Supabase articles');
    return globalCache;
  }

  // Start loading
  globalLoadingPromise = (async () => {
    try {
      if (!isSupabaseConfigured()) {
        console.log('ℹ️ Supabase not configured, using localStorage only');
        const localArticles = getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
        globalCache = localArticles;
        globalCacheTime = now;
        return localArticles;
      }

      console.log('🔄 Fetching articles from Supabase (PRIMARY source)...');
      const supabaseArticles = await getArticlesFromSupabase();
      const count = Object.keys(supabaseArticles).length;
      console.log(`✅ Loaded ${count} articles from Supabase`);

      // Update localStorage cache (for offline/performance)
      try {
        const localArticles = getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
        // Merge: Supabase is source of truth, but keep recent local edits
        const merged = { ...supabaseArticles, ...localArticles };
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn('Failed to update localStorage cache:', e);
      }

      globalCache = supabaseArticles;
      globalCacheTime = now;
      return supabaseArticles;
    } finally {
      globalLoadingPromise = null;
    }
  })();

  return globalLoadingPromise;
}

export function useArticles(): UseArticlesResult {
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
      globalCache = null;
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
    // On mount, fetch from Supabase (primary source)
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
  }, []);

  return { articles, isLoading, error, refetch };
}

// Invalidate cache when articles are saved/deleted
export function invalidateArticlesCache() {
  globalCache = null;
  globalCacheTime = 0;
  globalLoadingPromise = null;
}
