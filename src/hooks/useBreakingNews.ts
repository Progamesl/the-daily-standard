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
  // Breaking news table not yet created in Supabase — return empty to avoid
  // hitting Supabase on every public page load (egress + 404 errors).
  return { items: [], loading: false };
}
