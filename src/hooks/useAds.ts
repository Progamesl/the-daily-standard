/**
 * useAds — fetches active ads from Supabase with localStorage caching.
 * Only returns ads where active=true and the current date is within starts_at/ends_at.
 * Cache TTL: 10 minutes (same as article list).
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Ad {
  id: string;
  title: string;
  advertiser: string;
  image_url: string;
  link_url: string;
  placement: 'sidebar' | 'leaderboard' | 'inline';
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  created_at: string;
}

const CACHE_KEY = 'octagon_ads_cache';
const CACHE_TIME_KEY = 'octagon_ads_fetch_ts';
const CACHE_TTL = 10 * 60 * 1000; // 10 min

function isAdLive(ad: Ad): boolean {
  const now = Date.now();
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return false;
  if (ad.ends_at && new Date(ad.ends_at).getTime() < now) return false;
  return ad.active;
}

function readCache(): Ad[] | null {
  try {
    const ts = Number(localStorage.getItem(CACHE_TIME_KEY) || '0');
    if (Date.now() - ts > CACHE_TTL) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(ads: Ad[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(ads));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
  } catch { /* non-fatal */ }
}

export function clearAdsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  } catch { /* non-fatal */ }
}

/** Returns live ads for a given placement slot. */
export function useAds(placement: Ad['placement']): { ads: Ad[]; loading: boolean } {
  const [ads, setAds] = useState<Ad[]>(() => {
    const cached = readCache();
    return cached ? cached.filter(a => isAdLive(a) && a.placement === placement) : [];
  });
  const [loading, setLoading] = useState(!readCache());

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setAds(cached.filter(a => isAdLive(a) && a.placement === placement));
      setLoading(false);
      return;
    }

    if (!supabase) { setLoading(false); return; }

    supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const all = (data as Ad[]) || [];
        writeCache(all);
        setAds(all.filter(a => isAdLive(a) && a.placement === placement));
      })
      .catch(() => { /* silent — no ads is fine */ })
      .finally(() => setLoading(false));
  }, [placement]);

  return { ads, loading };
}
