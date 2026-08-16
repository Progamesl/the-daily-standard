/**
 * Admin Data Service
 * Full CRUD for articles and authors via localStorage.
 * Extended with editorial workflow, SEO, assignments, internal notes, and revision history.
 *
 * Migration path: When a backend (Supabase, etc.) is added, this file
 * becomes the abstraction layer switching between localStorage and the API.
 */
import octagonData from '@/data/octagonData.json';

// ─── Workflow ─────────────────────────────────────────────────────────────────

/** Full editorial workflow from pitch to archive. */
export type WorkflowStatus =
  | 'pitch'       // Story idea, not yet assigned
  | 'assigned'    // Assigned to a reporter
  | 'draft'       // Reporter actively writing
  | 'submitted'   // Reporter submitted for review
  | 'in_review'   // Editor is reviewing
  | 'approved'    // Approved, ready to go live
  | 'published'   // Live on site
  | 'archived'    // Taken off the site
  | 'deleted';    // In the trash — see TRASH_STATUS

/**
 * Deleting a story marks it with this status instead of destroying the row.
 *
 * The database delete used to be permanent, and the only copy of a deleted
 * story was a snapshot in the deleting person's own browser. Another editor
 * could not restore it, and clearing that browser lost it for good. Keeping the
 * row means the trash is the same trash for everyone, and restoring is one
 * click from any computer. It also keeps the story off the public site for
 * free: /api/sync-r2 only ever reads rows whose status is 'published'.
 *
 * It is not a status anyone can pick — you get here through Delete, and leave
 * through Restore.
 */
export const TRASH_STATUS = 'deleted' as const;

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  pitch:      'Pitch',
  assigned:   'Assigned',
  draft:      'Draft',
  submitted:  'Submitted',
  in_review:  'In Review',
  approved:   'Approved',
  published:  'Published',
  archived:   'Archived',
  deleted:    'In the trash',
};

/** The statuses an editor may choose. Trash is reached by deleting, not picking. */
export const SELECTABLE_STATUSES = (Object.keys(WORKFLOW_LABELS) as WorkflowStatus[])
  .filter(s => s !== TRASH_STATUS);

export const WORKFLOW_COLORS: Record<WorkflowStatus, string> = {
  pitch:      'bg-slate-100 text-slate-600',
  assigned:   'bg-blue-100 text-blue-700',
  draft:      'bg-amber-100 text-amber-700',
  submitted:  'bg-orange-100 text-orange-700',
  in_review:  'bg-violet-100 text-violet-700',
  approved:   'bg-teal-100 text-teal-700',
  published:  'bg-green-100 text-green-700',
  archived:   'bg-slate-100 text-slate-500',
  deleted:    'bg-red-100 text-red-700',
};

export type ArticlePriority = 'low' | 'normal' | 'high' | 'breaking';

export const PRIORITY_LABELS: Record<ArticlePriority, string> = {
  low:      'Low',
  normal:   'Normal',
  high:     'High',
  breaking: '🔴 Breaking',
};

export const PRIORITY_COLORS: Record<ArticlePriority, string> = {
  low:      'text-slate-400',
  normal:   'text-slate-600',
  high:     'text-amber-600',
  breaking: 'text-red-600 font-bold',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminAuthor {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  email?: string;
  twitter?: string;
  // ── Masthead ──
  // Everyone who has ever written for the paper is an author; only this year's
  // staff appear on /staff. These are the fields that decide that, and they are
  // the reason the staff page no longer needs a code change to update.
  /** Show this person on the public staff page. */
  onMasthead?: boolean;
  /** Which heading they appear under. */
  primarySection?: string;
  /** Other sections they also belong to. */
  altSections?: string[];
  /** Extra credits shown on their card, e.g. "Photographer". */
  tags?: string[];
  /** Position within their section, so an editor controls the order. */
  sortOrder?: number;
}

export interface InternalNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  type: 'note' | 'feedback' | 'approval' | 'rejection';
}

export interface ArticleRevision {
  id: string;
  savedAt: string;
  savedById: string;
  savedByName: string;
  headline: string;
  body: string;
  status: WorkflowStatus;
  note?: string;
}

export interface TrashedArticle {
  article: AdminArticle;
  deletedAt: string;
  deletedById: string;
  deletedByName: string;
  reason?: string;
}

export interface AdminArticle {
  id: string;
  slug: string;
  headline: string;
  dek: string;
  body: string;
  image: string;
  images: string[];
  imageCaption: string;
  section: string;
  author: AdminAuthor;
  publishedAt: string;
  updatedAt?: string;
  readingTime: number;
  tags: string[];
  status: WorkflowStatus;

  // ── Editorial Workflow ──────────────────────────────────────────────────────
  assignedToId?: string;     // user ID of assigned reporter
  assignedToName?: string;   // denormalized display name
  assignedById?: string;     // user ID of assigning editor
  reviewedById?: string;     // user ID of approving editor
  deadline?: string;         // ISO date string
  priority?: ArticlePriority;
  pitchSummary?: string;     // original pitch text

  // ── SEO ─────────────────────────────────────────────────────────────────────
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;

  // ── Editorial Notes & History ───────────────────────────────────────────────
  internalNotes?: InternalNote[];
  revisions?: ArticleRevision[];
  wordCount?: number;

  featured?: boolean;  // If true, this article appears as the main featured story on homepage
  isCinematic?: boolean; // If true, triggers the immersive high-impact design
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const ARTICLES_KEY        = 'octagon_admin_articles';
const DELETED_KEY         = 'octagon_admin_deleted';
const TRASH_KEY           = 'octagon_admin_trash_v2';  // Full article snapshots with metadata
const AUTHORS_KEY         = 'octagon_admin_authors';
const DELETED_AUTHORS_KEY = 'octagon_admin_deleted_authors';
const SETTINGS_KEY        = 'octagon_admin_settings';
const BACKUP_KEY          = 'octagon_admin_backups';  // Automatic backups

// ─── Storage Helpers with Caching ──────────────────────────────────────────────
const storageCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds cache

function getStorage<T>(key: string, fallback: T): T {
  const now = Date.now();
  const cached = storageCache.get(key);
  
  // Return cached if still valid
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data as T;
  }
  
  // Read from localStorage
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : fallback;
    storageCache.set(key, { data, timestamp: now });
    return data;
  } catch {
    storageCache.set(key, { data: fallback, timestamp: now });
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    const json = JSON.stringify(value);
    const sizeMB = new Blob([json]).size / (1024 * 1024);
    if (sizeMB > 4.5) { // Warn if approaching 5MB localStorage limit
      console.warn(`Storage key "${key}" is ${sizeMB.toFixed(2)} MB. Consider reducing image sizes.`);
    }
    localStorage.setItem(key, json);
    // Invalidate cache on write
    storageCache.delete(key);
    
    // Auto-backup on article/author changes
    if (key === ARTICLES_KEY || key === AUTHORS_KEY) {
      createAutoBackup();
    }
  } catch (err) {
    if (err instanceof DOMException && err.code === 22) {
      // QuotaExceededError
      throw new Error(`Storage quota exceeded. The data is too large (likely due to large base64 images). Please use image URLs instead of uploading files directly.`);
    }
    throw err;
  }
}

// ─── Automatic Backup System ──────────────────────────────────────────────────
interface Backup {
  id: string;
  timestamp: string;
  articles: Record<string, AdminArticle>;
  authors: Record<string, AdminAuthor>;
  deletedArticleIds: string[];
  deletedAuthorIds: string[];
}

function createAutoBackup(): void {
  try {
    const backups: Backup[] = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    const now = new Date();
    
    // Only backup if last backup was more than 1 hour ago (to avoid too many backups)
    const lastBackup = backups[0];
    if (lastBackup) {
      const lastBackupTime = new Date(lastBackup.timestamp).getTime();
      if (now.getTime() - lastBackupTime < 60 * 60 * 1000) {
        return; // Too soon, skip backup
      }
    }
    
    const backup: Backup = {
      id: `backup_${Date.now()}`,
      timestamp: now.toISOString(),
      articles: getAdminArticlesMap(),
      authors: getAdminAuthorsMap(),
      deletedArticleIds: getDeletedArticleIds(),
      deletedAuthorIds: getDeletedAuthorIds(),
    };
    
    backups.unshift(backup);
    // Keep last 10 backups (about 10 hours of hourly backups)
    const trimmed = backups.slice(0, 10);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(trimmed));
  } catch {
    // Non-fatal - backup failure shouldn't break the app
  }
}

export function getAutoBackups(): Backup[] {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
  } catch {
    return [];
  }
}

// ─── Supabase Sync ─────────────────────────────────────────────────────────────
/**
 * Actively sync articles from Supabase to localStorage.
 * Call this when you need to refresh data from Supabase (e.g., on page load).
 */
export async function syncArticlesFromSupabase(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    const { getArticlesFromSupabase } = await import('./supabaseDataService');
    const { isSupabaseConfigured } = await import('./supabaseClient');
    
    if (!isSupabaseConfigured()) {
      console.log('ℹ️ Supabase not configured, skipping sync');
      return false;
    }
    
    console.log('🔄 Syncing articles from Supabase...');
    const supabaseArticles = await getArticlesFromSupabase();
    const count = Object.keys(supabaseArticles).length;
    console.log(`📦 Loaded ${count} articles from Supabase`);
    
    // CRITICAL: Supabase is source of truth - it OVERWRITES localStorage
    // Only merge in localStorage articles that don't exist in Supabase (for offline edits)
    const localArticles = getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
    // Supabase first (source of truth), then add any local-only articles
    const merged = { ...supabaseArticles };
    Object.keys(localArticles).forEach(id => {
      if (!merged[id]) {
        merged[id] = localArticles[id]; // Only add if not in Supabase
      }
    });
    
    // Update localStorage
    try {
      setStorage(ARTICLES_KEY, merged);
      supabaseArticlesCache = supabaseArticles;
      supabaseArticlesCacheTime = Date.now();
      
      if (count > 0) {
        console.log(`✅ Synced ${count} articles from Supabase to localStorage`);
      } else {
        console.log('ℹ️ Supabase has no articles yet (localStorage kept as-is)');
      }
      return true;
    } catch (storageError) {
      console.error('❌ Failed to write to localStorage:', storageError);
      return false;
    }
  } catch (error) {
    console.error('❌ Error syncing from Supabase:', error);
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return false;
  }
}

export function restoreFromBackup(backupId: string): boolean {
  try {
    const backups: Backup[] = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return false;
    
    setStorage(ARTICLES_KEY, backup.articles);
    setStorage(AUTHORS_KEY, backup.authors);
    setStorage(DELETED_KEY, backup.deletedArticleIds);
    setStorage(DELETED_AUTHORS_KEY, backup.deletedAuthorIds);
    
    // Don't create a backup of a backup restore
    storageCache.delete(ARTICLES_KEY);
    storageCache.delete(AUTHORS_KEY);
    
    return true;
  } catch {
    return false;
  }
}

export function deleteBackup(backupId: string): void {
  try {
    const backups: Backup[] = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    const filtered = backups.filter(b => b.id !== backupId);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(filtered));
  } catch {
    // Non-fatal
  }
}

// ─── ID & Slug Helpers ────────────────────────────────────────────────────────
export function generateId(): string {
  return `admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateSlug(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function calculateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    .split(/\s+/).filter(Boolean).length;
}

/** Strip data: (base64) image src from HTML to avoid huge DB/egress. Call before save. */
export function stripBase64ImagesFromHtml(html: string): string {
  if (!html || typeof html !== 'string') return html;
  return html.replace(
    /src=["']data:image[^"']*["']/gi,
    'src=""'
  );
}

// ─── Article CRUD ─────────────────────────────────────────────────────────────
let supabaseArticlesCache: Record<string, AdminArticle> | null = null;
let supabaseArticlesCacheTime = 0;
// Guards the background Supabase list fetch so the ~N synchronous
// getAdminArticlesMap() calls in a single render don't each fire their own
// request (previously an ~11x egress storm on every page load).
let supabaseFetchInFlight = false;
const SUPABASE_CACHE_TTL = 60 * 1000; // 1 min (public pages fallback — admin uses DataSyncContext polling)
/** localStorage key for persisting the last-fetch timestamp across page loads */
const LIST_FETCH_TIME_KEY = 'octagon_list_fetch_ts';

/**
 * HEADLESS CMS: Get articles from Supabase (single source of truth)
 * Returns Supabase cache if available, otherwise localStorage (for offline/fallback)
 */
export function getAdminArticlesMap(): Record<string, AdminArticle> {
  const localArticles = getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
  
  // HEADLESS CMS: Supabase is source of truth - prioritize cache
  if (typeof window !== 'undefined') {
    const now = Date.now();
    // Check both in-memory AND persisted timestamp so refreshes/new tabs skip the fetch
    const persistedFetchTime = Number(localStorage.getItem(LIST_FETCH_TIME_KEY) || '0');
    const lastFetch = Math.max(supabaseArticlesCacheTime, persistedFetchTime);
    
    // In admin panel, we want much more frequent updates (30s)
    // Public site uses a longer TTL (5 min) to optimize egress
    const isAdmin = window.location.pathname.startsWith('/admin');
    const effectiveTTL = isAdmin ? 30 * 1000 : 5 * 60 * 1000;
    const useCache = (now - lastFetch) < effectiveTTL;
    
    if (!useCache && !supabaseFetchInFlight) {
      // In-flight guard: set synchronously so the other getAdminArticlesMap()
      // calls in this same render tick skip the fetch. Reset in .finally().
      supabaseFetchInFlight = true;
      // Fetch from Supabase in background (non-blocking for instant render).
      // Promises are returned through the chain so .finally() only resets the
      // guard once the whole fetch cycle has settled.
      import('./supabaseDataService')
        .then(({ getArticlesFromSupabase }) =>
          import('./supabaseClient').then(({ isSupabaseConfigured }) => {
            if (!isSupabaseConfigured()) return;
            return getArticlesFromSupabase().then(supabaseArticles => {
              // Always update cache, even if empty (clears stale data)
              supabaseArticlesCache = supabaseArticles;
              supabaseArticlesCacheTime = now;

              // CRITICAL: Supabase is source of truth - it OVERWRITES localStorage
              const merged = { ...supabaseArticles };
              Object.keys(localArticles).forEach(id => {
                if (!merged[id]) {
                  merged[id] = localArticles[id]; // Only add if not in Supabase
                }
              });

              // Update localStorage with merged data (cache for offline)
              try {
                localStorage.setItem(ARTICLES_KEY, JSON.stringify(merged));
                localStorage.setItem(LIST_FETCH_TIME_KEY, String(now)); // Persist timestamp
                storageCache.delete(ARTICLES_KEY);
                // Trigger global event so pages re-render with fresh data
                window.dispatchEvent(new CustomEvent('supabase-data-loaded'));
              } catch {
                // Non-fatal
              }
            });
          })
        )
        .catch(() => {
          // Silent fail - use localStorage
        })
        .finally(() => {
          supabaseFetchInFlight = false;
        });
    }
    
    // HEADLESS CMS: Return Supabase cache if available (source of truth)
    if (supabaseArticlesCache) {
      // Merge with local-only articles (for offline edits)
      const merged = { ...supabaseArticlesCache };
      Object.keys(localArticles).forEach(id => {
        if (!merged[id]) {
          merged[id] = localArticles[id];
        }
      });
      return merged;
    }
  }
  
  // Fallback to localStorage (offline mode or Supabase not configured)
  return localArticles;
}

/**
 * Every story the newsroom is working on.
 *
 * Trashed stories are excluded — they still exist as rows so the Trash page can
 * show and restore them, but they must not appear in Stories, counts, or the
 * dashboard as though they were live work.
 */
export function getAdminArticlesList(): AdminArticle[] {
  return Object.values(getAdminArticlesMap()).filter(a => a.status !== TRASH_STATUS);
}

/**
 * Get article by ID - checks both Supabase/localStorage AND seed data
 * This allows editing seed articles that haven't been migrated to Supabase yet
 */
export function getAdminArticle(id: string): AdminArticle | undefined {
  return getAdminArticlesMap()[id];
}

/**
 * Get article by slug — checks Supabase cache and localStorage only.
 */
export function getAdminArticleBySlug(slug: string): AdminArticle | undefined {
  return Object.values(getAdminArticlesMap()).find(a => a.slug === slug);
}

/**
 * Rebuild what readers see, and say whether it worked.
 *
 * The public site is served from R2, not from the database, so a story is only
 * really published — or really taken down — once this has run. It used to be
 * fired and forgotten, which meant a failure showed up nowhere except the
 * browser console: the editor was told the story was live when it wasn't.
 *
 * Every caller awaits this and reports the outcome. `npm run dev` has no
 * serverless functions, so a 404 there means "not deployed", not "broken" —
 * worth saying plainly rather than showing a scary error.
 */
export interface PublishResult {
  ok: boolean;
  /** Stories now live on the public site. */
  total?: number;
  /** Stories taken down by this run. */
  removed?: number;
  /** Plain-English explanation, present only when ok is false. */
  reason?: string;
}

export async function publishToReaders(): Promise<PublishResult> {
  try {
    const res = await fetch('/api/sync-r2', { method: 'POST' });
    if (res.status === 404) {
      return { ok: false, reason: 'The publishing service is not running. On a local dev server this is expected — it works on the live site.' };
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      return { ok: false, reason: data?.error || `The publishing service returned ${res.status}.` };
    }
    console.log(`Published to readers: ${data.total} stories live, ${data.removed ?? 0} taken down`);
    return { ok: true, total: data.total, removed: data.removed ?? 0 };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Could not reach the publishing service.' };
  }
}

/**
 * HEADLESS CMS: Save article to Supabase (single source of truth)
 * This function is now async and waits for Supabase confirmation.
 */
export async function saveAdminArticle(
  article: AdminArticle,
  savedById?: string,
  savedByName?: string,
  revisionNote?: string,
  options?: { upsertBy?: 'id' | 'slug'; onPublish?: (result: PublishResult) => void }
): Promise<AdminArticle> {
  const articles = getAdminArticlesMap();
  const existing = articles[article.id];

  // Append a new revision snapshot (keep last 20)
  const revisions: ArticleRevision[] = existing?.revisions ?? [];
  if (savedById && existing) {
    revisions.unshift({
      id: `rev_${Date.now()}`,
      savedAt: new Date().toISOString(),
      savedById,
      savedByName: savedByName ?? 'Unknown',
      headline: existing.headline,
      body: existing.body,
      status: existing.status,
      note: revisionNote,
    });
  }

  const saved: AdminArticle = {
    ...article,
    updatedAt: new Date().toISOString(),
    wordCount: countWords(article.body),
    revisions: revisions.slice(0, 20),
  };

  // HEADLESS CMS PATTERN: Supabase is SINGLE SOURCE OF TRUTH
  // Save to Supabase FIRST and wait for confirmation
  if (typeof window !== 'undefined') {
    const { isSupabaseConfigured } = await import('./supabaseClient');
    if (isSupabaseConfigured()) {
      const { saveArticleToSupabase } = await import('./supabaseDataService');
      const success = await saveArticleToSupabase(saved, options?.upsertBy ?? 'id');
      
      if (success) {
        console.log('✅ Article saved to Supabase (HEADLESS CMS):', saved.id);
        // Invalidate both in-memory and persisted cache so next public visitor gets fresh data
        supabaseArticlesCache = null;
        supabaseArticlesCacheTime = 0;
        try { localStorage.removeItem(LIST_FETCH_TIME_KEY); } catch { /* non-fatal */ }
        // Push the change out to readers.
        //
        // This used to run only when the saved status was 'published', so
        // unpublishing never reached the public site — the story stayed on the
        // homepage and at its own URL until somebody happened to publish
        // something else. Taking a story down is precisely when this has to
        // work, so it now also runs when a story that WAS live stops being so.
        const wasLive = existing?.status === 'published';
        if (saved.status === 'published' || wasLive) {
          options?.onPublish?.(await publishToReaders());
        }
        // 3. UPDATE LOCAL CACHE IMMEDIATELY (Prevents race conditions in list view)
        try {
          const currentLocal = getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
          currentLocal[saved.id] = saved;
          localStorage.setItem(ARTICLES_KEY, JSON.stringify(currentLocal));
          storageCache.delete(ARTICLES_KEY);
        } catch (e) { console.error('Failed to update local cache:', e); }

        // Trigger global refresh event so all pages know to re-render
        window.dispatchEvent(new CustomEvent('supabase-article-saved', { detail: { articleId: saved.id } }));
        window.dispatchEvent(new CustomEvent('octagon-data-sync'));
        window.dispatchEvent(new StorageEvent('storage', { key: ARTICLES_KEY }));
      } else {
        console.error('❌ CRITICAL: Failed to save to Supabase. Article saved to localStorage only.');
        throw new Error('Failed to save article to Supabase. Please check your connection and try again.');
      }
    }
  }

  // Update localStorage cache (for offline/performance — non-fatal if quota exceeded)
  try {
    articles[saved.id] = saved;
    setStorage(ARTICLES_KEY, articles);
  } catch (storageErr) {
    // localStorage quota exceeded — Supabase already saved successfully so this is safe to ignore.
    console.warn('⚠️ localStorage quota exceeded while caching article. Supabase save was successful.', storageErr);
  }

  // Un-delete if it was previously deleted
  try {
    const deleted = getDeletedArticleIds();
    const idx = deleted.indexOf(saved.id);
    if (idx > -1) {
      deleted.splice(idx, 1);
      setStorage(DELETED_KEY, deleted);
    }
  } catch { /* non-fatal */ }

  return saved;
}

export async function createAdminArticle(
  data: Omit<AdminArticle, 'id' | 'updatedAt' | 'wordCount' | 'revisions'>,
  savedById?: string,
  savedByName?: string,
  options?: { onPublish?: (result: PublishResult) => void }
): Promise<AdminArticle> {
  const article: AdminArticle = {
    ...data,
    id: generateId(),
    revisions: [],
    wordCount: countWords(data.body),
  };
  return saveAdminArticle(article, savedById, savedByName, 'Initial creation', options);
}

export async function deleteAdminArticle(
  id: string,
  deletedById?: string,
  deletedByName?: string,
  reason?: string
): Promise<void> {
  const articles = getAdminArticlesMap();
  let article = articles[id];
  
  // If not in admin articles, check seed data (for seed articles)
  if (!article && typeof window !== 'undefined') {
    const seedArticles = (octagonData as any).articles || [];
    const seedArticle = seedArticles.find((a: any) => String(a.id) === String(id));
    if (seedArticle) {
        // Convert seed Article to AdminArticle format for trash
        article = {
          id: String(seedArticle.id),
          slug: seedArticle.slug,
          headline: seedArticle.headline,
          dek: seedArticle.dek,
          body: seedArticle.body,
          image: seedArticle.image,
          images: seedArticle.images ?? [],
          imageCaption: seedArticle.imageCaption,
          section: seedArticle.section,
          author: {
            id: seedArticle.author.id,
            name: seedArticle.author.name,
            role: seedArticle.author.role,
            bio: seedArticle.author.bio,
            image: seedArticle.author.image,
            email: seedArticle.author.email,
            twitter: seedArticle.author.twitter,
          },
          publishedAt: seedArticle.publishedAt.toISOString(),
          updatedAt: seedArticle.updatedAt?.toISOString(),
          readingTime: seedArticle.readingTime,
          tags: seedArticle.tags,
          status: 'published',
          priority: 'normal',
        };
    }
  }
  
  // Only a story readers can currently see needs the public site rebuilding.
  const wasPublished = article?.status === 'published';

  if (!article) {
    // Nothing to delete — but a seed article can still be suppressed locally.
    const deletedIds = getDeletedArticleIds();
    if (!deletedIds.includes(String(id))) {
      deletedIds.push(String(id));
      setStorage(DELETED_KEY, deletedIds);
    }
    return;
  }

  // Work from the whole story, not the summary the list holds.
  //
  // Stories arrive from the list query without their body, gallery, tags,
  // notes or history, and trashing one writes the row back. Loading the full
  // version first means the trash keeps a complete story and restoring returns
  // everything — including the internal notes, which the trash note is about to
  // be added to.
  if (!article.body && typeof window !== 'undefined') {
    try {
      const { isSupabaseConfigured } = await import('./supabaseClient');
      if (isSupabaseConfigured()) {
        const { getArticleByIdFromSupabase } = await import('./supabaseDataService');
        const full = await getArticleByIdFromSupabase(id);
        if (full) article = full;
      }
    } catch { /* fall back to what we have; the save has its own guard */ }
  }

  // Move the story to the trash rather than destroying it.
  //
  // The row used to be hard-deleted from the database, with the only surviving
  // copy a snapshot in the deleting person's own browser. Another editor could
  // not see it in Trash, could not restore it, and could not find out why it
  // went — and if that browser was ever cleared, a story the newsroom had
  // worked on was gone for good. Keeping the row, marked, means the trash is
  // the same trash for everybody.
  //
  // The delete note carries the status to restore to, so a published story
  // comes back as a draft rather than silently reappearing on the site.
  const trashNote: InternalNote = {
    id: `trash_${Date.now()}`,
    authorId: deletedById ?? 'unknown',
    authorName: deletedByName ?? 'Unknown',
    content: JSON.stringify({
      kind: 'trash',
      previousStatus: article.status,
      reason: reason ?? '',
    }),
    type: 'note',
    createdAt: new Date().toISOString(),
  };

  // saveAdminArticle rebuilds the public site whenever a live story stops being
  // live, which covers the takedown. Its result is captured here rather than
  // running a second rebuild, because each one re-uploads every story in the
  // paper and a bulk delete would otherwise do that twice per story.
  let publish: PublishResult | null = null;

  await saveAdminArticle(
    {
      ...article,
      status: TRASH_STATUS,
      internalNotes: [trashNote, ...(article.internalNotes ?? [])],
    },
    deletedById,
    deletedByName,
    reason ? `Moved to trash: ${reason}` : 'Moved to trash',
    { onPublish: r => { publish = r; } },
  );

  if (wasPublished && publish && !(publish as PublishResult).ok) {
    throw new Error(
      'The story was moved to the trash, but the public site could not be updated, so it may still be visible. ' +
      (publish as PublishResult).reason,
    );
  }
}

/** The delete note written by deleteAdminArticle, if this story is in the trash. */
function readTrashNote(article: AdminArticle): { previousStatus: WorkflowStatus; reason: string; at: string; byId: string; byName: string } | null {
  const note = (article.internalNotes ?? []).find(n => {
    try {
      return JSON.parse(n.content)?.kind === 'trash';
    } catch {
      return false;
    }
  });
  if (!note) return null;
  try {
    const parsed = JSON.parse(note.content);
    return {
      previousStatus: (parsed.previousStatus as WorkflowStatus) ?? 'draft',
      reason: parsed.reason ?? '',
      at: note.createdAt,
      byId: note.authorId,
      byName: note.authorName,
    };
  } catch {
    return null;
  }
}

/**
 * Everything in the trash, for the whole newsroom.
 *
 * Queries the trashed rows directly rather than reading the shared article
 * cache: that cache is loaded with a short column list which leaves out
 * internal_notes, and the note recording who deleted a story, when and why
 * lives in there. Without it the Trash page could only say "Unknown".
 *
 * Anything left in the old browser-local trash from before deletion became a
 * server-side thing is folded in, so nothing already there is stranded.
 */
export async function fetchTrashedArticles(): Promise<TrashedArticle[]> {
  const entries: TrashedArticle[] = [];

  if (typeof window !== 'undefined') {
    try {
      const { supabase } = await import('./supabaseClient');
      if (supabase) {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('status', TRASH_STATUS)
          .order('updated_at', { ascending: false });
        if (!error && data) {
          const { rowToAdminArticleForTrash } = await import('./supabaseDataService');
          for (const row of data as unknown as Record<string, unknown>[]) {
            const article = rowToAdminArticleForTrash(row);
            const note = readTrashNote(article);
            entries.push({
              article,
              deletedAt: note?.at ?? article.updatedAt ?? new Date().toISOString(),
              deletedById: note?.byId ?? 'unknown',
              deletedByName: note?.byName ?? 'Unknown',
              reason: note?.reason || undefined,
            });
          }
        }
      }
    } catch { /* fall through to the local copy */ }
  }

  const seen = new Set(entries.map(t => t.article.id));
  const legacy = getStorage<TrashedArticle[]>(TRASH_KEY, []).filter(t => !seen.has(t.article.id));

  return [...entries, ...legacy].sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
  );
}

/**
 * Take a story back out of the trash.
 *
 * It comes back as a draft unless it was something other than published when it
 * was deleted — restoring must never put a story back on the public site by
 * itself. Someone presses Publish for that.
 */
export async function restoreTrashedArticle(
  trashId: string,
  restoredById?: string,
  restoredByName?: string,
): Promise<AdminArticle | undefined> {
  const entry = (await fetchTrashedArticles()).find(t => t.article.id === trashId);
  if (!entry) return undefined;

  const note = readTrashNote(entry.article);
  const previous = note?.previousStatus ?? 'draft';

  const restored = await saveAdminArticle(
    {
      ...entry.article,
      status: previous === 'published' ? 'draft' : previous,
      internalNotes: (entry.article.internalNotes ?? []).filter(n => {
        try { return JSON.parse(n.content)?.kind !== 'trash'; } catch { return true; }
      }),
    },
    restoredById,
    restoredByName,
    'Restored from trash',
  );

  // Clear the leftovers from the old browser-local trash, if this was one.
  const legacy = getStorage<TrashedArticle[]>(TRASH_KEY, []);
  const idx = legacy.findIndex(t => t.article.id === trashId);
  if (idx > -1) {
    legacy.splice(idx, 1);
    setStorage(TRASH_KEY, legacy);
  }
  const deleted = getDeletedArticleIds();
  const delIdx = deleted.indexOf(trashId);
  if (delIdx > -1) {
    deleted.splice(delIdx, 1);
    setStorage(DELETED_KEY, deleted);
  }

  return restored;
}

/**
 * Destroy a story for good. There is nothing after this.
 *
 * The database delete used to float off in an unawaited promise, so "Delete
 * forever" reported success whether or not anything happened. It is awaited
 * now and throws if the row survives.
 */
export async function permanentlyDeleteTrashedArticle(trashId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const { isSupabaseConfigured } = await import('./supabaseClient');
    if (isSupabaseConfigured()) {
      const { deleteArticleFromSupabase } = await import('./supabaseDataService');
      const success = await deleteArticleFromSupabase(trashId);
      if (!success) {
        throw new Error('The story could not be deleted from the database. Nothing was changed — try again.');
      }
      supabaseArticlesCache = null;
      supabaseArticlesCacheTime = 0;
      try { localStorage.removeItem(LIST_FETCH_TIME_KEY); } catch { /* non-fatal */ }
    }
  }

  const articles = getAdminArticlesMap();
  if (articles[trashId]) {
    delete articles[trashId];
    setStorage(ARTICLES_KEY, articles);
  }

  const legacy = getStorage<TrashedArticle[]>(TRASH_KEY, []);
  const idx = legacy.findIndex(t => t.article.id === trashId);
  if (idx > -1) {
    legacy.splice(idx, 1);
    setStorage(TRASH_KEY, legacy);
  }
}

export function clearTrash(): void {
  setStorage(TRASH_KEY, []);
}

export function getDeletedArticleIds(): string[] {
  return getStorage<string[]>(DELETED_KEY, []);
}

export async function duplicateAdminArticle(id: string): Promise<AdminArticle | undefined> {
  const source = getAdminArticle(id);
  if (!source) return undefined;
  return createAdminArticle({
    ...source,
    headline: `${source.headline} (Copy)`,
    slug: `${source.slug}-copy-${Date.now().toString(36)}`,
    status: 'draft',
    publishedAt: new Date().toISOString(),
    internalNotes: [],
  });
}

// ─── Internal Notes ───────────────────────────────────────────────────────────
export function addInternalNote(
  articleId: string,
  note: Omit<InternalNote, 'id' | 'createdAt'>
): AdminArticle | undefined {
  const articles = getAdminArticlesMap();
  const article = articles[articleId];
  if (!article) return undefined;
  const newNote: InternalNote = {
    ...note,
    id: `note_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  article.internalNotes = [newNote, ...(article.internalNotes ?? [])];
  article.updatedAt = new Date().toISOString();
  articles[articleId] = article;
  setStorage(ARTICLES_KEY, articles);
  return article;
}

export function deleteInternalNote(articleId: string, noteId: string): void {
  const articles = getAdminArticlesMap();
  const article = articles[articleId];
  if (!article) return;
  article.internalNotes = (article.internalNotes ?? []).filter(n => n.id !== noteId);
  articles[articleId] = article;
  setStorage(ARTICLES_KEY, articles);
}

// ─── Revision Restore ─────────────────────────────────────────────────────────
export async function restoreRevision(
  articleId: string,
  revisionId: string,
  restoredById: string,
  restoredByName: string
): Promise<AdminArticle | undefined> {
  const article = getAdminArticle(articleId);
  if (!article) return undefined;
  const rev = (article.revisions ?? []).find(r => r.id === revisionId);
  if (!rev) return undefined;
  return saveAdminArticle(
    { ...article, headline: rev.headline, body: rev.body, status: rev.status },
    restoredById,
    restoredByName,
    `Restored from revision ${new Date(rev.savedAt).toLocaleString()}`
  );
}

// ─── Author CRUD ──────────────────────────────────────────────────────────────

/** One-time seed: pre-populate admin authors from the real staff list if none exist yet. */
function seedAuthorsIfEmpty(): void {
  const existing = getStorage<Record<string, AdminAuthor>>(AUTHORS_KEY, {});
  if (Object.keys(existing).length > 0) return; // already seeded

  // Dynamically import to avoid circular deps — works fine since this is a side-effect at init
  import('@/data/staffData').then(({ ALL_MEMBERS, staffId }) => {
    const map: Record<string, AdminAuthor> = {};
    ALL_MEMBERS.forEach(m => {
      const id = staffId(m.name);
      map[id] = {
        id,
        name: m.name,
        role: m.role,
        bio: m.bio ?? '',
        image: m.photo ?? '',
        email: m.email ?? '',
        twitter: '',
      };
    });
    setStorage(AUTHORS_KEY, map);
  });
}

// Trigger seed on module load
seedAuthorsIfEmpty();

export function getAdminAuthorsMap(): Record<string, AdminAuthor> {
  return getStorage<Record<string, AdminAuthor>>(AUTHORS_KEY, {});
}

export function getAdminAuthorsList(): AdminAuthor[] {
  return Object.values(getAdminAuthorsMap());
}

/** Force re-seed authors from staff data (wipes existing admin authors) */
export function reseedAuthorsFromStaff(): void {
  setStorage(AUTHORS_KEY, {});
  seedAuthorsIfEmpty();
}

export function getAdminAuthor(id: string): AdminAuthor | undefined {
  return getAdminAuthorsMap()[id];
}

export function saveAdminAuthor(author: AdminAuthor): AdminAuthor {
  const authors = getAdminAuthorsMap();
  authors[author.id] = author;
  setStorage(AUTHORS_KEY, authors);

  // Persist to Supabase too, or the edit would live only in this browser and
  // nobody else — readers included — would ever see it. Written in the
  // background so the UI stays responsive; localStorage above is the immediate
  // local copy.
  void (async () => {
    try {
      const { saveAuthorToSupabase } = await import('./supabaseDataService');
      await saveAuthorToSupabase(author);
    } catch (err) {
      console.warn('Author saved locally but not to the server:', err);
    }
  })();

  return author;
}

/**
 * Pull authors from Supabase into the local cache, so a browser that didn't
 * make an edit still sees it. Mirrors syncArticlesFromSupabase.
 */
export async function syncAuthorsFromSupabase(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { getAuthorsFromSupabase } = await import('./supabaseDataService');
    const { isSupabaseConfigured } = await import('./supabaseClient');
    if (!isSupabaseConfigured()) return false;

    const remote = await getAuthorsFromSupabase();
    if (!remote || Object.keys(remote).length === 0) return false;

    // Server wins; keep local-only authors that haven't been pushed yet.
    const local = getStorage<Record<string, AdminAuthor>>(AUTHORS_KEY, {});
    const merged = { ...remote };
    Object.keys(local).forEach(id => {
      if (!merged[id]) merged[id] = local[id];
    });
    setStorage(AUTHORS_KEY, merged);
    return true;
  } catch (err) {
    console.warn('Could not sync authors from the server:', err);
    return false;
  }
}

export function createAdminAuthor(data: Omit<AdminAuthor, 'id'>): AdminAuthor {
  const author: AdminAuthor = { ...data, id: generateId() };
  return saveAdminAuthor(author);
}

export function updateAdminAuthor(
  id: string,
  updates: Partial<AdminAuthor>
): AdminAuthor | undefined {
  const authors = getAdminAuthorsMap();
  if (!authors[id]) return undefined;
  const updated = { ...authors[id], ...updates, id };
  authors[id] = updated;
  setStorage(AUTHORS_KEY, authors);

  // Propagate to all articles by this author
  const articles = getAdminArticlesMap();
  let changed = false;
  for (const [aid, article] of Object.entries(articles)) {
    if (article.author.id === id) {
      articles[aid] = { ...article, author: updated };
      changed = true;
    }
  }
  if (changed) setStorage(ARTICLES_KEY, articles);
  return updated;
}

export function deleteAdminAuthor(id: string): void {
  const authors = getAdminAuthorsMap();
  if (authors[id]) {
    delete authors[id];
    setStorage(AUTHORS_KEY, authors);
  }
  const deleted = getStorage<string[]>(DELETED_AUTHORS_KEY, []);
  if (!deleted.includes(id)) {
    deleted.push(id);
    setStorage(DELETED_AUTHORS_KEY, deleted);
  }

  // Remove it on the server as well, or the next sync would restore it.
  void (async () => {
    try {
      const { deleteAuthorFromSupabase } = await import('./supabaseDataService');
      await deleteAuthorFromSupabase(id);
    } catch (err) {
      console.warn('Author removed locally but not on the server:', err);
    }
  })();
}

export function getDeletedAuthorIds(): string[] {
  return getStorage<string[]>(DELETED_AUTHORS_KEY, []);
}

/**
 * Merge duplicate authors and reassign their stories.
 * Finds authors with the same normalized name (case-insensitive) and merges them:
 * - Keeps the author with more stories, or admin-created over seed if tied
 * - Updates all articles to reference the kept author
 * - Deletes duplicate authors
 * 
 * @returns Object with stats: { merged: number, articlesUpdated: number }
 */
export function mergeDuplicateAuthors(): { merged: number; articlesUpdated: number } {
  const seedAuthors = (octagonData as any).authors || [];
  const authors = getAdminAuthorsMap();
  const articles = getAdminArticlesMap();
  
  // Build a map of normalized name -> author IDs
  const byName = new Map<string, string[]>();
  
  // Collect all authors (seed + admin)
  const allAuthorIds = new Set<string>();
  seedAuthors.forEach((a: AdminAuthor) => {
    allAuthorIds.add(a.id);
    const normalized = a.name.trim().toLowerCase();
    if (!byName.has(normalized)) byName.set(normalized, []);
    byName.get(normalized)!.push(a.id);
  });
  
  Object.keys(authors).forEach(id => {
    allAuthorIds.add(id);
    const normalized = authors[id].name.trim().toLowerCase();
    if (!byName.has(normalized)) byName.set(normalized, []);
    if (!byName.get(normalized)!.includes(id)) {
      byName.get(normalized)!.push(id);
    }
  });
  
  let merged = 0;
  let articlesUpdated = 0;
  
  // Process each duplicate group
  byName.forEach((authorIds, normalizedName) => {
    if (authorIds.length <= 1) return; // No duplicates
    
    // Count stories per author
    const storyCounts = new Map<string, number>();
    authorIds.forEach(aid => {
      const count = Object.values(articles).filter(a => a.author.id === aid).length;
      storyCounts.set(aid, count);
    });
    
    // Pick the author to keep:
    // 1. Prefer admin-created over seed (admin authors exist in authors map)
    // 2. If both/neither are admin, prefer the one with more stories
    // 3. If tied, prefer the first one alphabetically by ID
    const keepId = authorIds.reduce((best, current) => {
      const bestIsAdmin = authors[best] !== undefined;
      const currentIsAdmin = authors[current] !== undefined;
      
      if (currentIsAdmin && !bestIsAdmin) return current;
      if (bestIsAdmin && !currentIsAdmin) return best;
      
      const bestCount = storyCounts.get(best) ?? 0;
      const currentCount = storyCounts.get(current) ?? 0;
      
      if (currentCount > bestCount) return current;
      if (bestCount > currentCount) return best;
      
      return current < best ? current : best;
    });
    
    // Get the author object to keep (from admin or seed)
    const keepAuthor: AdminAuthor = authors[keepId] ?? 
      seedAuthors.find((a: AdminAuthor) => a.id === keepId) ?? 
      authors[authorIds[0]] ?? seedAuthors.find((a: AdminAuthor) => a.id === authorIds[0]);
    
    if (!keepAuthor) return;
    
    // Update all articles referencing duplicate authors
    const duplicates = authorIds.filter(id => id !== keepId);
    duplicates.forEach(dupId => {
      let changed = false;
      Object.keys(articles).forEach(articleId => {
        if (articles[articleId].author.id === dupId) {
          articles[articleId] = {
            ...articles[articleId],
            author: keepAuthor,
          };
          changed = true;
          articlesUpdated++;
        }
      });
      
      if (changed) {
        setStorage(ARTICLES_KEY, articles);
      }
      
      // Delete duplicate author (if it's admin-created)
      if (authors[dupId]) {
        deleteAdminAuthor(dupId);
        merged++;
      }
    });
  });
  
  return { merged, articlesUpdated };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
/** Normalize date to ISO string for Supabase TIMESTAMPTZ. */
function toIsoDate(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string' && val) return new Date(val).toISOString();
  return new Date().toISOString();
}

export async function importJsonArticle(jsonArticle: Record<string, unknown>): Promise<AdminArticle> {
  const authorRaw = (jsonArticle.author ?? {}) as Record<string, unknown>;
  const authorId = String(authorRaw.id ?? '').trim() || `author_${generateId().slice(-8)}`;
  // Always generate a fresh admin ID so Supabase never gets a numeric/seed ID
  const existingId = String(jsonArticle.id ?? '');
  const id = existingId.startsWith('admin_') || existingId.match(/^[0-9a-f-]{36}$/i)
    ? existingId
    : generateId();
  const article: AdminArticle = {
    id,
    slug: String(jsonArticle.slug ?? '').trim() || `article-${id.slice(-8)}`,
    headline: String(jsonArticle.headline ?? ''),
    dek: String(jsonArticle.dek ?? ''),
    body: String(jsonArticle.body ?? ''),
    image: String(jsonArticle.image ?? ''),
    images: Array.isArray(jsonArticle.images) ? jsonArticle.images as string[] : [],
    imageCaption: String(jsonArticle.imageCaption ?? ''),
    section: String(jsonArticle.section ?? ''),
    author: {
      id: authorId,
      name: String(authorRaw.name ?? 'Unknown Author'),
      role: String(authorRaw.role ?? 'Student Journalist'),
      bio: String(authorRaw.bio ?? ''),
      image: String(authorRaw.image ?? ''),
      email: authorRaw.email ? String(authorRaw.email) : undefined,
      twitter: authorRaw.twitter ? String(authorRaw.twitter) : undefined,
    },
    publishedAt: toIsoDate(jsonArticle.publishedAt),
    updatedAt: new Date().toISOString(),
    readingTime: Number(jsonArticle.readingTime ?? 1),
    tags: Array.isArray(jsonArticle.tags) ? jsonArticle.tags as string[] : [],
    status: (jsonArticle.status as AdminArticle['status']) || 'published',
    priority: (jsonArticle.priority as ArticlePriority) || 'normal',
    internalNotes: [],
    revisions: [],
  };

  // Check if already imported (same slug exists in Supabase) — avoids re-importing
  if (typeof window !== 'undefined') {
    const { isSupabaseConfigured } = await import('./supabaseClient');
    if (isSupabaseConfigured()) {
      const { getArticleBySlugFromSupabase, saveAuthorToSupabase } = await import('./supabaseDataService');
      const existing = await getArticleBySlugFromSupabase(article.slug, { publishedOnly: false });
      if (existing) {
        console.log('✅ Article already imported, navigating directly:', article.slug);
        return existing;
      }
      // Ensure author exists in Supabase before saving article (seed authors may not be migrated)
      await saveAuthorToSupabase(article.author);
    }
  }

  // Fall back to localStorage-only save if Supabase save fails, so editor can still open the article
  try {
    return await saveAdminArticle(article, undefined, undefined, undefined, { upsertBy: 'slug' });
  } catch {
    console.warn('⚠️ Supabase save failed — saving to localStorage only so editor can open article:', article.slug);
    const articles = getAdminArticlesMap();
    articles[article.id] = { ...article, updatedAt: new Date().toISOString() };
    setStorage(ARTICLES_KEY, articles);
    return articles[article.id];
  }
}

export function getAllAdminTags(): string[] {
  const tags = new Set<string>();
  getAdminArticlesList().forEach(a => a.tags?.forEach(t => tags.add(t)));
  return Array.from(tags).sort();
}

// ─── Data Export / Import ─────────────────────────────────────────────────────
export function exportAdminData(): string {
  return JSON.stringify({
    articles: getAdminArticlesMap(),
    deletedArticleIds: getDeletedArticleIds(),
    authors: getAdminAuthorsMap(),
    deletedAuthorIds: getDeletedAuthorIds(),
    exportedAt: new Date().toISOString(),
    version: 2,
  }, null, 2);
}

export async function importAdminDataFromJson(json: string): Promise<{ articles: number; authors: number }> {
  const data = JSON.parse(json);
  
  let articlesCount = 0;
  let authorsCount = 0;
  
  // Save to localStorage first
  if (data.articles) {
    setStorage(ARTICLES_KEY, data.articles);
    articlesCount = Object.keys(data.articles).length;
  }
  if (data.deletedArticleIds) setStorage(DELETED_KEY, data.deletedArticleIds);
  if (data.authors) {
    setStorage(AUTHORS_KEY, data.authors);
    authorsCount = Object.keys(data.authors).length;
  }
  if (data.deletedAuthorIds) setStorage(DELETED_AUTHORS_KEY, data.deletedAuthorIds);
  
  // CRITICAL: Also save to Supabase (so it persists across devices)
  if (typeof window !== 'undefined') {
    const { isSupabaseConfigured } = await import('./supabaseClient');
    if (isSupabaseConfigured()) {
      console.log('💾 Importing to Supabase...');
      const { saveArticleToSupabase, saveAuthorToSupabase } = await import('./supabaseDataService');
      
      // Save all articles to Supabase
      if (data.articles) {
        const articles = Object.values(data.articles) as AdminArticle[];
        let savedArticles = 0;
        for (const article of articles) {
          try {
            if (await saveArticleToSupabase(article)) {
              savedArticles++;
            }
          } catch (err) {
            console.warn(`Failed to save article ${article.id} to Supabase:`, err);
          }
        }
        console.log(`✅ Saved ${savedArticles}/${articles.length} articles to Supabase`);
      }
      
      // Save all authors to Supabase
      if (data.authors) {
        const authors = Object.values(data.authors) as AdminAuthor[];
        let savedAuthors = 0;
        for (const author of authors) {
          try {
            if (await saveAuthorToSupabase(author)) {
              savedAuthors++;
            }
          } catch (err) {
            console.warn(`Failed to save author ${author.id} to Supabase:`, err);
          }
        }
        console.log(`✅ Saved ${savedAuthors}/${authors.length} authors to Supabase`);
      }
    }
  }
  
  return { articles: articlesCount, authors: authorsCount };
}

export function clearAdminData(): void {
  localStorage.removeItem(ARTICLES_KEY);
  localStorage.removeItem(DELETED_KEY);
  localStorage.removeItem(AUTHORS_KEY);
  localStorage.removeItem(DELETED_AUTHORS_KEY);
}

// ─── Site Settings ────────────────────────────────────────────────────────────
export interface SiteSettings {
  siteName: string;
  tagline: string;
  contactEmail: string;
  socialTwitter: string;
  socialInstagram: string;
  defaultMetaDescription: string;
  articlesPerPage: number;
  enableComments: boolean;
  enableNewsletter: boolean;
  maintenanceMode: boolean;
  announcementBanner: string;
  primaryColor: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'The Octagon',
  tagline: 'The official student newspaper of Sacramento Country Day School',
  contactEmail: 'octagon@saccds.org',
  socialTwitter: '',
  socialInstagram: '',
  defaultMetaDescription: 'Student journalism from Sacramento Country Day School.',
  articlesPerPage: 20,
  enableComments: false,
  enableNewsletter: true,
  maintenanceMode: false,
  announcementBanner: '',
  primaryColor: '#1e293b',
};

/** Single row in the site_settings table holding the whole settings object. */
const SETTINGS_ROW_KEY = 'site';

export function getSiteSettings(): SiteSettings {
  return { ...DEFAULT_SETTINGS, ...getStorage<Partial<SiteSettings>>(SETTINGS_KEY, {}) };
}

export function saveSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  const current = getSiteSettings();
  const updated = { ...current, ...settings };
  setStorage(SETTINGS_KEY, updated);

  // Settings used to be localStorage-only, so changing the site name, tagline
  // or announcement banner only changed it for the person who typed it.
  void (async () => {
    try {
      const { getSupabaseClient } = await import('./supabaseClient');
      const client = getSupabaseClient();
      if (!client) return;
      await client
        .from('site_settings')
        .upsert(
          { key: SETTINGS_ROW_KEY, value: updated, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
    } catch (err) {
      console.warn('Settings saved locally but not to the server:', err);
    }
  })();

  return updated;
}

/** Pull site settings from Supabase so every browser shows the same values. */
export async function syncSiteSettingsFromSupabase(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { getSupabaseClient } = await import('./supabaseClient');
    const client = getSupabaseClient();
    if (!client) return false;

    const { data, error } = await client
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_ROW_KEY)
      .maybeSingle();

    if (error || !data?.value) return false;
    setStorage(SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...(data.value as Partial<SiteSettings>) });
    return true;
  } catch (err) {
    console.warn('Could not sync settings from the server:', err);
    return false;
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface AdminStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  pitchCount: number;
  inReviewCount: number;
  approvedCount: number;
  submittedCount: number;
  totalAuthors: number;
  articlesThisMonth: number;
  overdueCount: number;
  articlesBySection: Record<string, number>;
  articlesByStatus: Record<WorkflowStatus, number>;
}

export function getAdminStats(
  allArticles: AdminArticle[],
  allAuthors: AdminAuthor[]
): AdminStats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const byStatus = {} as Record<WorkflowStatus, number>;

  allArticles.forEach(a => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  });

  return {
    totalArticles: allArticles.length,
    publishedArticles: byStatus['published'] || 0,
    draftArticles: byStatus['draft'] || 0,
    archivedArticles: byStatus['archived'] || 0,
    pitchCount: byStatus['pitch'] || 0,
    inReviewCount: byStatus['in_review'] || 0,
    approvedCount: byStatus['approved'] || 0,
    submittedCount: byStatus['submitted'] || 0,
    totalAuthors: allAuthors.length,
    articlesThisMonth: allArticles.filter(a => new Date(a.publishedAt) >= monthStart).length,
    overdueCount: allArticles.filter(a =>
      a.deadline &&
      new Date(a.deadline) < now &&
      !['published', 'archived'].includes(a.status)
    ).length,
    articlesBySection: allArticles.reduce((acc, a) => {
      acc[a.section] = (acc[a.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    articlesByStatus: byStatus,
  };
}

