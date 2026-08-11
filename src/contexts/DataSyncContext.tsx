/**
 * DataSyncContext
 *
 * Mounted ONCE around every route (see App.tsx). Behaviour is route-aware:
 *   /admin/*  → sync from Supabase (admin source of truth, throttled)
 *   all other → sync from R2 (free egress, updated after every CMS save)
 *
 * After every CMS article save:
 *   1. Supabase is written (adminDataService)
 *   2. /api/sync-r2 runs server-side → uploads fresh JSON to R2
 *   3. This context clears the R2 cache + re-fetches → public pages re-render
 *   4. Visitors see the new/updated article within the poll window, no redeploy.
 *
 * Freshness SLA:
 *   - editor's own tab: ~1.5s after save (supabase-article-saved event)
 *   - other visitors:   next visible-tab poll (~30s) + Cloudflare edge cache
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  syncArticlesFromSupabase,
  syncAuthorsFromSupabase,
  syncSiteSettingsFromSupabase,
} from '@/lib/adminDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { getArticleListFromR2, isR2ArticlesConfigured, clearR2Cache } from '@/lib/r2Articles';
import { setR2ArticleCache, clearR2ArticleCache } from '@/lib/publicDataService';

const ADMIN_SYNC_THROTTLE_MS = 30 * 1000; // 30 seconds
const ADMIN_POLL_MS = 5 * 60 * 1000; // 5 minutes
const PUBLIC_POLL_MS = 30 * 1000; // 30 seconds while the tab is visible
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

  // Route-reactive: recomputed on every navigation so the same provider instance
  // serves both public and admin routes correctly.
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  // ── Admin sync: Supabase → localStorage ────────────────────────────────────
  const runAdminSync = useCallback(async (skipThrottle = false) => {
    if (!isSupabaseConfigured()) return;

    if (!skipThrottle && typeof sessionStorage !== 'undefined') {
      const last = sessionStorage.getItem(LAST_SYNC_KEY);
      if (last && Date.now() - Number(last) < ADMIN_SYNC_THROTTLE_MS) return;
    }

    setIsSyncing(true);
    try {
      // Authors and site settings are pulled alongside articles: they used to
      // be localStorage-only, so an edit made on one machine was invisible
      // everywhere else. Failures here are non-fatal.
      const [synced] = await Promise.all([
        syncArticlesFromSupabase(),
        syncAuthorsFromSupabase().catch(() => false),
        syncSiteSettingsFromSupabase().catch(() => false),
      ]);
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
    if (!isR2ArticlesConfigured()) {
      console.warn('[DataSync] R2 not configured — VITE_R2_PUBLIC_BASE_URL is missing from this build');
      return;
    }
    try {
      const items = await getArticleListFromR2();
      if (items) {
        setR2ArticleCache(items);
        setSyncVersion(v => v + 1);
        console.log(`[DataSync] R2 loaded: ${items.length} articles`);
      }
    } catch (err) {
      console.warn('[DataSync] R2 fetch failed (using cached/seed data):', err);
    }
  }, []);

  const triggerSync = useCallback(() => {
    if (isAdminPath) {
      runAdminSync(true);
    } else {
      clearR2Cache();
      clearR2ArticleCache();
      runR2Sync();
    }
  }, [isAdminPath, runAdminSync, runR2Sync]);

  // ── Initial load + polling (route-aware) ───────────────────────────────────
  useEffect(() => {
    if (isAdminPath) {
      // Poll so open admin sessions see new articles without a reload.
      // Egress optimization: only poll while the tab is visible.
      const poll = setInterval(() => {
        if (document.visibilityState === 'visible') {
          runAdminSync(false);
        }
      }, ADMIN_POLL_MS);
      return () => clearInterval(poll);
    }

    // Public pages: sync from R2 (zero Supabase egress) with a Supabase fallback.
    if (isR2ArticlesConfigured()) {
      runR2Sync();
    } else {
      console.log('[DataSync] Falling back to Supabase sync (R2 unavailable)');
      runAdminSync(false);
    }

    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (isR2ArticlesConfigured()) {
        clearR2Cache();
        clearR2ArticleCache();
        runR2Sync();
      } else {
        runAdminSync(false);
      }
    }, PUBLIC_POLL_MS);
    return () => clearInterval(poll);
  }, [isAdminPath, runAdminSync, runR2Sync]);

  // ── Cross-tab / post-save refresh listeners ────────────────────────────────
  // (Kept in its own effect so it always attaches — the previous version placed
  // this after an early `return` in the polling effect, so it was dead code and
  // published articles never refreshed live.)
  useEffect(() => {
    const handleArticleSaved = () => {
      if (isAdminPath) {
        runAdminSync(true);
      } else {
        // Small delay so /api/sync-r2 has time to finish uploading to R2.
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
