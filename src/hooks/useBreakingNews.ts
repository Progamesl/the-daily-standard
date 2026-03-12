/**
 * useBreakingNews Hook
 *
 * Fetches active breaking news items and subscribes to Realtime updates.
 * When a new item is inserted or updated, it refetches immediately.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface BreakingNewsItem {
  id: string;
  text: string;
  url: string | null;
  active: boolean;
  priority: number;
  created_at: string;
  expires_at: string | null;
}

interface UseBreakingNewsReturn {
  items: BreakingNewsItem[];
  loading: boolean;
}

export function useBreakingNews(): UseBreakingNewsReturn {
  const [items, setItems] = useState<BreakingNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBreakingNews() {
      try {
        const { data, error } = await supabase
          .from('breaking_news')
          .select('*')
          .eq('active', true)
          .or('expires_at.is.null,expires_at.gt.now()')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch breaking news:', error);
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setItems((data as BreakingNewsItem[]) || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching breaking news:', err);
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
      }
    }

    fetchBreakingNews();

    // ─── Realtime subscription ────────────────────────────────────────────────
    const channel = supabase
      .channel('breaking-news-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'breaking_news',
        },
        () => {
          // Refetch on any change
          if (!cancelled) {
            fetchBreakingNews();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading };
}
