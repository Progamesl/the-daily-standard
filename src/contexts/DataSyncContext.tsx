/**
 * DataSyncContext - NYTimes Pattern
 * 
 * Optimistic rendering: Show cached content INSTANTLY, update from Supabase in background.
 * Supabase is PRIMARY source of truth for writes, localStorage is cache for reads.
 * 
 * This gives instant page loads (like NYTimes) while ensuring data consistency.
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
    
    // Sync in background (non-blocking) - pages render instantly from cache
    try {
      if (isSupabaseConfigured()) {
        console.log('🔄 Background sync from Supabase...');
        const synced = await syncArticlesFromSupabase();
        if (synced) {
          console.log('✅ Background sync complete - pages will update automatically');
          setSyncVersion(v => v + 1); // Trigger re-render with fresh data
        }
      }
    } catch (err) {
      console.warn('⚠️ Background sync failed (using cache):', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Run sync in background on app start (non-blocking)
  useEffect(() => {
    // Small delay to let page render first (instant load)
    const timer = setTimeout(() => {
      runSync();
    }, 100);
    return () => clearTimeout(timer);
  }, [runSync]);

  return (
    <DataSyncContext.Provider value={{ syncVersion, isSyncing, triggerSync: runSync }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export const useDataSync = () => useContext(DataSyncContext);
