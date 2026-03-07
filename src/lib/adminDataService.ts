/**
 * Admin Data Service
 * Full CRUD for articles and authors via localStorage.
 * Extended with editorial workflow, SEO, assignments, internal notes, and revision history.
 *
 * Migration path: When a backend (Supabase, etc.) is added, this file
 * becomes the abstraction layer switching between localStorage and the API.
 */

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

  // ── Homepage Feature ─────────────────────────────────────────────────────────
  featured?: boolean;  // If true, this article appears as the main featured story on homepage
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

// ─── Article CRUD ─────────────────────────────────────────────────────────────
export function getAdminArticlesMap(): Record<string, AdminArticle> {
  return getStorage<Record<string, AdminArticle>>(ARTICLES_KEY, {});
}

export function getAdminArticlesList(): AdminArticle[] {
  return Object.values(getAdminArticlesMap());
}

export function getAdminArticle(id: string): AdminArticle | undefined {
  return getAdminArticlesMap()[id];
}

export function getAdminArticleBySlug(slug: string): AdminArticle | undefined {
  return Object.values(getAdminArticlesMap()).find(a => a.slug === slug);
}

export function saveAdminArticle(
  article: AdminArticle,
  savedById?: string,
  savedByName?: string,
  revisionNote?: string
): AdminArticle {
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
  articles[saved.id] = saved;
  setStorage(ARTICLES_KEY, articles);

  // Also save to Supabase if configured (async, non-blocking)
  if (typeof window !== 'undefined') {
    import('./supabaseDataService').then(({ saveArticleToSupabase }) => {
      import('./supabaseClient').then(({ isSupabaseConfigured }) => {
        if (isSupabaseConfigured()) {
          saveArticleToSupabase(saved).catch(() => {
            // Silent fail - localStorage is primary, Supabase is backup
          });
        }
      }).catch(() => {});
    }).catch(() => {
      // Supabase not available
    });
  }

  // Un-delete if it was previously deleted
  const deleted = getDeletedArticleIds();
  const idx = deleted.indexOf(saved.id);
  if (idx > -1) {
    deleted.splice(idx, 1);
    setStorage(DELETED_KEY, deleted);
  }

  return saved;
}

export function createAdminArticle(
  data: Omit<AdminArticle, 'id' | 'updatedAt' | 'wordCount' | 'revisions'>,
  savedById?: string,
  savedByName?: string
): AdminArticle {
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
  const article = articles[id];
  
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
    
    // Remove from active articles
    delete articles[id];
    setStorage(ARTICLES_KEY, articles);
  }

  const deleted = getDeletedArticleIds();
  if (!deleted.includes(String(id))) {
    deleted.push(String(id));
    setStorage(DELETED_KEY, deleted);
  }
}

export function getTrashedArticles(): TrashedArticle[] {
  return getStorage<TrashedArticle[]>(TRASH_KEY, []);
}

export function restoreTrashedArticle(trashId: string): AdminArticle | undefined {
  const trash = getTrashedArticles();
  const idx = trash.findIndex(t => t.article.id === trashId);
  if (idx === -1) return undefined;
  
  const trashed = trash[idx];
  const restored = saveAdminArticle(trashed.article, undefined, undefined, 'Restored from trash');
  
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
}

export function clearTrash(): void {
  setStorage(TRASH_KEY, []);
}

export function getDeletedArticleIds(): string[] {
  return getStorage<string[]>(DELETED_KEY, []);
}

export function duplicateAdminArticle(id: string): AdminArticle | undefined {
  const source = getAdminArticle(id);
  if (!source) return undefined;
  return createAdminArticle({
    ...source,
    headline: `${source.headline} (Copy)`,
    slug: `${source.slug}-copy-${Date.now().toString(36)}`,
    status: 'draft',
    publishedAt: new Date().toISOString(),
    internalNotes: [],
    revisions: [],
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
export function restoreRevision(
  articleId: string,
  revisionId: string,
  restoredById: string,
  restoredByName: string
): AdminArticle | undefined {
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
  // Dynamic import to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { authors: seedAuthors } = require('@/data/seedData') as { authors: AdminAuthor[] };
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
export function importJsonArticle(jsonArticle: Record<string, unknown>): AdminArticle {
  const authorRaw = (jsonArticle.author ?? {}) as Record<string, unknown>;
  const article: AdminArticle = {
    id: String(jsonArticle.id ?? generateId()),
    slug: String(jsonArticle.slug ?? ''),
    headline: String(jsonArticle.headline ?? ''),
    dek: String(jsonArticle.dek ?? ''),
    body: String(jsonArticle.body ?? ''),
    image: String(jsonArticle.image ?? ''),
    images: Array.isArray(jsonArticle.images) ? jsonArticle.images as string[] : [],
    imageCaption: String(jsonArticle.imageCaption ?? ''),
    section: String(jsonArticle.section ?? ''),
    author: {
      id: String(authorRaw.id ?? ''),
      name: String(authorRaw.name ?? ''),
      role: String(authorRaw.role ?? 'Student Journalist'),
      bio: String(authorRaw.bio ?? ''),
      image: String(authorRaw.image ?? ''),
      email: authorRaw.email ? String(authorRaw.email) : undefined,
      twitter: authorRaw.twitter ? String(authorRaw.twitter) : undefined,
    },
    publishedAt: String(jsonArticle.publishedAt ?? new Date().toISOString()),
    updatedAt: new Date().toISOString(),
    readingTime: Number(jsonArticle.readingTime ?? 1),
    tags: Array.isArray(jsonArticle.tags) ? jsonArticle.tags as string[] : [],
    status: 'published',
    priority: 'normal',
    internalNotes: [],
    revisions: [],
  };
  return saveAdminArticle(article);
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

export function importAdminDataFromJson(json: string): void {
  const data = JSON.parse(json);
  if (data.articles) setStorage(ARTICLES_KEY, data.articles);
  if (data.deletedArticleIds) setStorage(DELETED_KEY, data.deletedArticleIds);
  if (data.authors) setStorage(AUTHORS_KEY, data.authors);
  if (data.deletedAuthorIds) setStorage(DELETED_AUTHORS_KEY, data.deletedAuthorIds);
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

