/**
 * DataSyncContext - PRODUCTION PATTERN
 * 
 * Like NYTimes/WordPress: Supabase is PRIMARY source of truth.
 * Blocks rendering until Supabase data is loaded (or timeout).
 * localStorage is just a cache for performance.
 * 
 * This ensures ALL browsers/devices see the same data from Supabase.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncArticlesFromSupabase } from '@/lib/adminDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

interface DataSyncContextType {
  /** Increments each time Supabase data is successfully loaded */
  syncVersion: number;
  isSyncing: boolean;
  /** Whether initial sync is complete (app can render) */
  isReady: boolean;
  /** Manually trigger a re-sync */
  triggerSync: () => void;
}

const DataSyncContext = createContext<DataSyncContextType>({
  syncVersion: 0,
  isSyncing: false,
  isReady: false,
  triggerSync: () => {},
});

const SYNC_TIMEOUT = 10000; // 10 seconds max wait

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const [syncVersion, setSyncVersion] = useState(0);
  const [isSyncing, setIsSyncing] = useState(true); // Start as loading
  const [isReady, setIsReady] = useState(false);

  const runSync = useCallback(async () => {
    setIsSyncing(true);
    console.log('🔄 DataSync: Loading from Supabase (PRIMARY source)...');
    
    const startTime = Date.now();
    
    try {
      // If Supabase is configured, wait for sync (this is the source of truth)
      if (isSupabaseConfigured()) {
        const synced = await Promise.race([
          syncArticlesFromSupabase(),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), SYNC_TIMEOUT))
        ]);
        
        if (synced) {
          const elapsed = Date.now() - startTime;
          console.log(`✅ DataSync: Loaded from Supabase in ${elapsed}ms`);
        } else {
          console.warn('⚠️ DataSync: Sync timed out or returned false. Using localStorage cache.');
        }
      } else {
        console.log('ℹ️ DataSync: Supabase not configured, using localStorage only');
      }
      
      // Always mark as ready (even if sync failed, we have localStorage cache)
      setSyncVersion(v => v + 1);
      setIsReady(true);
    } catch (err) {
      console.error('❌ DataSync: Sync failed:', err);
      // Still mark as ready (fallback to localStorage)
      setIsReady(true);
      setSyncVersion(v => v + 1);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Run sync once on app start - BLOCKS until complete (or timeout)
  useEffect(() => {
    runSync();
  }, [runSync]);

  return (
    <DataSyncContext.Provider value={{ syncVersion, isSyncing, isReady, triggerSync: runSync }}>
      {children}
    </DataSyncContext.Provider>
  );
}

export const useDataSync = () => useContext(DataSyncContext);
