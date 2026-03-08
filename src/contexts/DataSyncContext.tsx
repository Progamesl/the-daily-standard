/**
 * DataSyncContext - HEADLESS CMS Pattern
 * 
 * Supabase is the SINGLE SOURCE OF TRUTH.
 * This context ensures all pages automatically sync from Supabase:
 * - On app load (immediate sync)
 * - When articles are saved (instant sync)
 * - When Supabase data loads (automatic re-render)
 * 
 * Pages render instantly from cache, then update when Supabase data arrives.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncArticlesFromSupabase } from '@/lib/adminDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

interface DataSyncContextType {
  /** Increments each time Supabase data is successfully loaded */
  syncVersion: number;
  isSyncing: boolean;
  /** Manually trigger a re-sync */
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

  const runSync = useCallback(async () => {
    setIsSyncing(true);
    
    // HEADLESS CMS: Sync from Supabase (single source of truth)
    try {
      if (isSupabaseConfigured()) {
        console.log('🔄 HEADLESS CMS: Syncing from Supabase...');
        const synced = await syncArticlesFromSupabase();
        if (synced) {
          console.log('✅ HEADLESS CMS: Sync complete - all pages updated');
          setSyncVersion(v => v + 1); // Trigger re-render with fresh data
        } else {
          console.warn('⚠️ HEADLESS CMS: Sync returned false - check console for errors');
        }
      }
    } catch (err) {
      console.warn('⚠️ HEADLESS CMS: Sync failed (using cache):', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // HEADLESS CMS: Sync immediately on app start + listen for events
  useEffect(() => {
    // Sync immediately (pages render from cache instantly, then update)
    runSync();

    // Listen for article saves - trigger immediate sync
    const handleArticleSaved = () => {
      console.log('📢 HEADLESS CMS: Article saved - syncing...');
      runSync();
    };
    window.addEventListener('supabase-article-saved', handleArticleSaved);
    
    // Listen for Supabase data loaded - trigger re-render
    const handleDataLoaded = () => {
      console.log('📢 HEADLESS CMS: Supabase data loaded - updating pages...');
      setSyncVersion(v => v + 1);
    };
    window.addEventListener('supabase-data-loaded', handleDataLoaded);
    
    return () => {
      window.removeEventListener('supabase-article-saved', handleArticleSaved);
      window.removeEventListener('supabase-data-loaded', handleDataLoaded);
    };
  }, [runSync]);

  return (
    <DataSyncContext.Provider value={{ syncVersion, isSyncing, triggerSync: runSync }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export const useDataSync = () => useContext(DataSyncContext);
