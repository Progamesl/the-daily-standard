/**
 * DataSyncContext
 * 
 * Syncs articles from Supabase to localStorage once when the app loads.
 * All public pages subscribe to this context — when Supabase data arrives,
 * they re-render and pull fresh data from localStorage automatically.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncArticlesFromSupabase } from '@/lib/adminDataService';

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

  const runSync = useCallback(() => {
    setIsSyncing(true);
    console.log('🔄 DataSync: Starting sync from Supabase...');
    syncArticlesFromSupabase()
      .then(synced => {
        // Always increment syncVersion to trigger re-render, even if sync returned false
        // (sync might return false if Supabase has 0 articles, but we still want to trigger re-render)
        setSyncVersion(v => v + 1);
        if (synced) {
          console.log('✅ DataSync: Supabase articles loaded, triggering public page refresh');
        } else {
          console.log('ℹ️ DataSync: Sync completed (may have 0 articles or Supabase not configured)');
        }
      })
      .catch(err => {
        console.error('❌ DataSync: Sync failed with error:', err);
        // Still increment to trigger re-render even on error
        setSyncVersion(v => v + 1);
      })
      .finally(() => setIsSyncing(false));
  }, []);

  // Run sync once on app start
  useEffect(() => {
    runSync();
  }, [runSync]);

  return (
    <DataSyncContext.Provider value={{ syncVersion, isSyncing, triggerSync: runSync }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export const useDataSync = () => useContext(DataSyncContext);
