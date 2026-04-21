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
  | 'archived';   // Taken off the site

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  pitch:      'Pitch',
  assigned:   'Assigned',
  draft:      'Draft',
  submitted:  'Submitted',
  in_review:  'In Review',
  approved:   'Approved',
  published:  'Published',
  archived:   'Archived',
};

export const WORKFLOW_COLORS: Record<WorkflowStatus, string> = {
  pitch:      'bg-slate-100 text-slate-600',
  assigned:   'bg-blue-100 text-blue-700',
  draft:      'bg-amber-100 text-amber-700',
  submitted:  'bg-orange-100 text-orange-700',
  in_review:  'bg-violet-100 text-violet-700',
  approved:   'bg-teal-100 text-teal-700',
  published:  'bg-green-100 text-green-700',
  archived:   'bg-slate-100 text-slate-500',
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
    
    if (!useCache) {
      // Fetch from Supabase in background (non-blocking for instant render)
      import('./supabaseDataService').then(({ getArticlesFromSupabase }) => {
        import('./supabaseClient').then(({ isSupabaseConfigured }) => {
          if (isSupabaseConfigured()) {
            getArticlesFromSupabase().then(supabaseArticles => {
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
            }).catch(() => {
              // Silent fail - use localStorage
            });
          }
        }).catch(() => {});
      }).catch(() => {});
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

export function getAdminArticlesList(): AdminArticle[] {
  return Object.values(getAdminArticlesMap());
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
 * HEADLESS CMS: Save article to Supabase (single source of truth)
 * This function is now async and waits for Supabase confirmation.
 */
export async function saveAdminArticle(
  article: AdminArticle,
  savedById?: string,
  savedByName?: string,
  revisionNote?: string,
  options?: { upsertBy?: 'id' | 'slug' }
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
        // Trigger R2 sync so public site gets fresh data instantly (only for published articles)
        if (saved.status === 'published') {
          fetch('/api/sync-r2', { method: 'POST' })
            .then(r => r.json())
            .then(data => {
              if (data?.ok) {
                console.log(`✅ R2 sync complete: ${data.total} articles published`);
              }
            })
            .catch(err => console.error('❌ R2 sync fetch failed:', err));
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
  savedByName?: string
): Promise<AdminArticle> {
  const article: AdminArticle = {
    ...data,
    id: generateId(),
    revisions: [],
    wordCount: countWords(data.body),
  };
  return saveAdminArticle(article, savedById, savedByName, 'Initial creation');
}

export function deleteAdminArticle(
  id: string,
  deletedById?: string,
  deletedByName?: string,
  reason?: string
): void {
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
  
  if (article) {
    // Move to trash with full snapshot
    const trash: TrashedArticle[] = getStorage<TrashedArticle[]>(TRASH_KEY, []);
    trash.unshift({
      article,
      deletedAt: new Date().toISOString(),
      deletedById: deletedById ?? 'unknown',
      deletedByName: deletedByName ?? 'Unknown',
      reason,
    });
    // Keep last 100 trashed articles
    setStorage(TRASH_KEY, trash.slice(0, 100));
    
    // Remove from active articles (if it was in admin articles)
    if (articles[id]) {
      delete articles[id];
      setStorage(ARTICLES_KEY, articles);
    }
  }

  // Always add to deleted list (works for both admin and seed articles)
  const deleted = getDeletedArticleIds();
  if (!deleted.includes(String(id))) {
    deleted.push(String(id));
    setStorage(DELETED_KEY, deleted);
  }

  // Also delete from Supabase if configured (async, non-blocking)
  if (typeof window !== 'undefined') {
    import('./supabaseDataService').then(({ deleteArticleFromSupabase }) => {
      import('./supabaseClient').then(({ isSupabaseConfigured }) => {
        if (isSupabaseConfigured()) {
          deleteArticleFromSupabase(id).then(success => {
            if (success) {
              console.log('✅ Article deleted from Supabase:', id);
            } else {
              console.warn('⚠️ Failed to delete article from Supabase:', id);
            }
          }).catch(err => {
            console.error('❌ Error deleting from Supabase:', err);
          });
        }
      }).catch(() => {});
    }).catch(() => {
      // Supabase not available
    });
  }
}

export function getTrashedArticles(): TrashedArticle[] {
  return getStorage<TrashedArticle[]>(TRASH_KEY, []);
}

export async function restoreTrashedArticle(trashId: string): Promise<AdminArticle | undefined> {
  const trash = getTrashedArticles();
  const idx = trash.findIndex(t => t.article.id === trashId);
  if (idx === -1) return undefined;
  
  const trashed = trash[idx];
  const restored = await saveAdminArticle(trashed.article, undefined, undefined, 'Restored from trash');
  
  // Remove from trash
  trash.splice(idx, 1);
  setStorage(TRASH_KEY, trash);
  
  // Remove from deleted list
  const deleted = getDeletedArticleIds();
  const delIdx = deleted.indexOf(trashId);
  if (delIdx > -1) {
    deleted.splice(delIdx, 1);
    setStorage(DELETED_KEY, deleted);
  }
  
  return restored;
}

export function permanentlyDeleteTrashedArticle(trashId: string): void {
  const trash = getTrashedArticles();
  const idx = trash.findIndex(t => t.article.id === trashId);
  if (idx > -1) {
    trash.splice(idx, 1);
    setStorage(TRASH_KEY, trash);
  }

  // Also permanently delete from Supabase if configured (async, non-blocking)
  if (typeof window !== 'undefined') {
    import('./supabaseDataService').then(({ deleteArticleFromSupabase }) => {
      import('./supabaseClient').then(({ isSupabaseConfigured }) => {
        if (isSupabaseConfigured()) {
          deleteArticleFromSupabase(trashId).then(success => {
            if (success) {
              console.log('✅ Article permanently deleted from Supabase:', trashId);
            } else {
              console.warn('⚠️ Failed to permanently delete article from Supabase:', trashId);
            }
          }).catch(err => {
            console.error('❌ Error permanently deleting from Supabase:', err);
          });
        }
      }).catch(() => {});
    }).catch(() => {
      // Supabase not available
    });
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
  return author;
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

export function getSiteSettings(): SiteSettings {
  return { ...DEFAULT_SETTINGS, ...getStorage<Partial<SiteSettings>>(SETTINGS_KEY, {}) };
}

export function saveSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  const current = getSiteSettings();
  const updated = { ...current, ...settings };
  setStorage(SETTINGS_KEY, updated);
  return updated;
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

