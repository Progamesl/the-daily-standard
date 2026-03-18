/**
 * DataSyncContext
 *
 * Routing:
 *   /admin/*  → sync from Supabase (admin source of truth, throttled to 5 min)
 *   all other → sync from R2 (free egress, updated after every CMS save)
 *
 * After every CMS article save:
 *   1. Supabase is written (adminDataService)
 *   2. /api/sync-r2 runs server-side → uploads fresh JSON to R2
 *   3. DataSyncContext clears R2 cache + re-fetches → public pages re-render
 *   4. All visitors see the new article immediately, no redeploy needed.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncArticlesFromSupabase } from '@/lib/adminDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { getArticleListFromR2, isR2ArticlesConfigured, clearR2Cache } from '@/lib/r2Articles';
import { setR2ArticleCache, clearR2ArticleCache } from '@/lib/publicDataService';

const ADMIN_SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 min
const LAST_SYNC_KEY = 'octagon_admin_last_sync';

interface DataSyncContextType {
  syncVersion: number;
  isSyncing: boolean;
  triggerSync: () => void;
}

const DataSyncContext = createContext<DataSyncContextType>({
  syncVersion: 0,
  isSyncing: false,
  triggerSync: () => {},
});

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const [syncVersion, setSyncVersion] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Admin sync: Supabase → localStorage ────────────────────────────────────
  const runAdminSync = useCallback(async (skipThrottle = false) => {
    if (!isSupabaseConfigured()) return;

    if (!skipThrottle && typeof sessionStorage !== 'undefined') {
      const last = sessionStorage.getItem(LAST_SYNC_KEY);
      if (last && Date.now() - Number(last) < ADMIN_SYNC_THROTTLE_MS) return;
    }

    setIsSyncing(true);
    try {
      const synced = await syncArticlesFromSupabase();
      if (synced) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        }
        setSyncVersion(v => v + 1);
      }
    } catch (err) {
      console.warn('Admin sync failed (using cache):', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ── Public sync: R2 → publicDataService cache ───────────────────────────────
  const runR2Sync = useCallback(async () => {
    if (!isR2ArticlesConfigured()) return;
    try {
      const items = await getArticleListFromR2();
      if (items) {
        setR2ArticleCache(items);
        setSyncVersion(v => v + 1);
      }
    } catch (err) {
      console.warn('R2 sync failed (using cached/seed data):', err);
    }
  }, []);

  const isAdminPath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  const triggerSync = useCallback(() => {
    if (isAdminPath) {
      runAdminSync(true);
    } else {
      clearR2Cache();
      clearR2ArticleCache();
      runR2Sync();
    }
  }, [isAdminPath, runAdminSync, runR2Sync]);

  useEffect(() => {
    if (isAdminPath) {
      // Admin pages: sync from Supabase (throttled)
      runAdminSync(false);
    } else {
      // Public pages: sync from R2 (zero Supabase egress)
      runR2Sync();
    }

    // When a CMS article is saved, re-sync to show the new article immediately
    const handleArticleSaved = () => {
      if (isAdminPath) {
        runAdminSync(true);
      } else {
        // Small delay so /api/sync-r2 has time to finish uploading to R2
        setTimeout(() => {
          clearR2Cache();
          clearR2ArticleCache();
          runR2Sync();
        }, 1500);
      }
    };

    const handleDataLoaded = () => setSyncVersion(v => v + 1);

    window.addEventListener('supabase-article-saved', handleArticleSaved);
    window.addEventListener('supabase-data-loaded', handleDataLoaded);
    return () => {
      window.removeEventListener('supabase-article-saved', handleArticleSaved);
      window.removeEventListener('supabase-data-loaded', handleDataLoaded);
    };
  }, [isAdminPath, runAdminSync, runR2Sync]);

  return (
    <DataSyncContext.Provider value={{ syncVersion, isSyncing, triggerSync }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export const useDataSync = () => useContext(DataSyncContext);
