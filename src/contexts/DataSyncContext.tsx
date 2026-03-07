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
    syncArticlesFromSupabase()
      .then(synced => {
        if (synced) {
          setSyncVersion(v => v + 1);
          console.log('🔄 DataSync: Supabase articles loaded, triggering public page refresh');
        }
      })
      .catch(err => console.warn('DataSync: sync failed', err))
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
