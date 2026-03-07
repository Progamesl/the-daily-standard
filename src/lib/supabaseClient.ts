/**
 * Supabase Client
 * 
 * To enable Supabase:
 * 1. Create a free account at https://supabase.com
 * 2. Create a new project
 * 3. Get your project URL and anon key from Settings > API
 * 4. Add them to your .env file:
 *    VITE_SUPABASE_URL=your-project-url
 *    VITE_SUPABASE_ANON_KEY=your-anon-key
 * 5. Run the SQL migration script in supabase/migrations.sql
 */

let supabaseClient: any = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    // Supabase not configured - will use localStorage fallback
    return null;
  }
  
  // Lazy load Supabase client
  import('@supabase/supabase-js').then(({ createClient }) => {
    supabaseClient = createClient(url, anonKey);
  }).catch(() => {
    // Supabase package not installed
    console.warn('Supabase package not installed. Run: npm install @supabase/supabase-js');
  });
  
  return null; // Will be set after async import
}

export function isSupabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
