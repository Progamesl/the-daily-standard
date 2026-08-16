/**
 * Supabase Client — Synchronous Singleton
 *
 * Creates a single SupabaseClient at import time using VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY from the environment.  Every module that imports
 * `supabase` gets the same instance.
 *
 * Setup:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Add to .env:
 *      VITE_SUPABASE_URL=https://your-project.supabase.co
 *      VITE_SUPABASE_ANON_KEY=your-anon-key
 * 3. Run supabase/migrations.sql in the Supabase SQL Editor
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─── Database type (matches supabase/migrations.sql) ─────────────────────────
export interface Database {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string;
          slug: string;
          headline: string;
          dek: string | null;
          body: string;
          image: string | null;
          images: string[] | null;
          image_caption: string | null;
          section: string;
          author_id: string;
          author_name: string;
          author_role: string | null;
          author_bio: string | null;
          author_image: string | null;
          published_at: string;
          updated_at: string;
          reading_time: number | null;
          tags: string[] | null;
          status: string;
          priority: string | null;
          featured: boolean | null;
          assigned_to_id: string | null;
          assigned_to_name: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['articles']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['articles']['Row']>;
      };
      admin_users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          display_name: string;
          email: string;
          role: string;
          section: string | null;
          bio: string | null;
          avatar: string | null;
          phone: string | null;
          graduation_year: string | null;
          active: boolean;
          email_verified: boolean;
          two_factor_enabled: boolean;
          approved_by: string | null;
          approved_at: string | null;
          password_changed_at: string | null;
          password_expires_at: string | null;
          locked_until: string | null;
          failed_attempts: number;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admin_users']['Row']>;
      };
    };
  };
}

// ─── Environment ─────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// ─── Singleton client ────────────────────────────────────────────────────────
let _client: SupabaseClient<Database> | null = null;

/**
 * Run the operation without a cross-tab lock.
 *
 * By default the auth library takes a Web Locks lock around anything that
 * touches the session, so two tabs cannot refresh the token at the same moment.
 * When one tab does steal the lock, whichever request was waiting rejects with
 * `AbortError: Lock broken by another request with the 'steal' option` — and
 * because every database query attaches the session, that abort surfaces as the
 * query failing. In the admin it came out as "Failed to fetch admin profile",
 * which drops a signed-in editor back to the login page. Anyone working with
 * the site open in one tab and the admin in another hit it constantly.
 *
 * Losing the lock means two tabs can occasionally refresh the same token
 * together. The server accepts that — a refresh token stays valid for a short
 * window after use, precisely so this is survivable — and an occasional
 * duplicate refresh is a far better failure than being signed out mid-sentence.
 */
const noCrossTabLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => fn();

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    _client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: noCrossTabLock,
      },
    });
  } catch (err) {
    // A malformed VITE_SUPABASE_URL must not crash the whole app — degrade to
    // localStorage/R2 instead of throwing at import time.
    console.error(
      '⚠️ Failed to initialize Supabase client (check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY):',
      err
    );
    _client = null;
  }
} else {
  console.warn(
    '⚠️ Supabase not configured — missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'The app will fall back to localStorage.'
  );
}

/**
 * The shared Supabase client.
 * Will be `null` only if the env vars are missing.
 */
export const supabase: SupabaseClient<Database> | null = _client;

/**
 * Returns true when both env vars are present (i.e. `supabase` is not null).
 */
export function isSupabaseConfigured(): boolean {
  return _client !== null;
}

/**
 * @deprecated Use the named export `supabase` instead.
 * Kept for backwards-compat with code that calls getSupabaseClient().
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  return _client;
}
