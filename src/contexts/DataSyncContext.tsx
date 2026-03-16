/**
 * DataSyncContext - HEADLESS CMS Pattern
 *
 * Supabase is the SINGLE SOURCE OF TRUTH.
 * Sync is throttled to cut admin egress: only sync on load if last sync was >5 min ago,
 * and always on article save or manual "Refresh".
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncArticlesFromSupabase } from '@/lib/adminDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

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

  const runSync = useCallback(async (skipThrottle = false) => {
    if (!isSupabaseConfigured()) return;

    if (!skipThrottle && typeof sessionStorage !== 'undefined') {
      const last = sessionStorage.getItem(LAST_SYNC_KEY);
      if (last) {
        const elapsed = Date.now() - Number(last);
        if (elapsed < ADMIN_SYNC_THROTTLE_MS) {
          return; // Use cache; don't hit Supabase again yet
        }
      }
    }

    setIsSyncing(true);
    try {
      const synced = await syncArticlesFromSupabase();
      if (synced) {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        setSyncVersion(v => v + 1);
      }
    } catch (err) {
      console.warn('HEADLESS CMS: Sync failed (using cache):', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const triggerSync = useCallback(() => runSync(true), [runSync]);

  useEffect(() => {
    runSync(false); // Throttled initial sync

    const handleArticleSaved = () => runSync(true);
    window.addEventListener('supabase-article-saved', handleArticleSaved);

    const handleDataLoaded = () => setSyncVersion(v => v + 1);
    window.addEventListener('supabase-data-loaded', handleDataLoaded);

    return () => {
      window.removeEventListener('supabase-article-saved', handleArticleSaved);
      window.removeEventListener('supabase-data-loaded', handleDataLoaded);
    };
  }, [runSync]);

  return (
    <DataSyncContext.Provider value={{ syncVersion, isSyncing, triggerSync }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export const useDataSync = () => useContext(DataSyncContext);
