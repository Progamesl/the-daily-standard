import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { TagInput } from '@/components/admin/TagInput';
import { ImageUpload } from '@/components/admin/ImageUpload';
import {
  ArrowLeft, Save, Eye, Send, Loader2, Clock, MessageSquare,
  History, Trash2, AlertTriangle, ChevronDown, ChevronUp, Search,
  Undo2, Redo2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type AdminArticle,
  type AdminAuthor,
  type InternalNote,
  type ArticleRevision,
  type WorkflowStatus,
  WORKFLOW_LABELS
} from '@/lib/adminDataService';
import { getArticleByIdFromSupabase } from '@/lib/supabaseDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { ROLE_LABELS, logActivity } from '@/lib/adminUserService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { authors as jsonAuthors, sections } from '@/data/seedData';
import { cn } from '@/lib/utils';
import { DocxImporter } from '@/components/admin/DocxImporter';

const AUTOSAVE_DELAY = 5000;

type ArticlePriority = 'low' | 'normal' | 'high' | 'breaking';

interface FormState {
  headline: string;
  dek: string;
  body: string;
  image: string;
  imageCaption: string;
  section: string;
  authorId: string;
  tags: string[];
  slug: string;
  status: WorkflowStatus;
  publishedAt: string;
  // Workflow
  assignedToId: string;
  deadline: string;
  priority: ArticlePriority;
  pitchSummary: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  canonicalUrl: string;
  // Homepage Feature
  featured: boolean;
  isCinematic: boolean;
}

const emptyForm: FormState = {
  headline: '', dek: '', body: '', image: '', imageCaption: '',
  section: 'us', authorId: '', tags: [], slug: '', status: 'draft',
  publishedAt: new Date().toISOString().slice(0, 16),
  assignedToId: '', deadline: '', priority: 'normal', pitchSummary: '',
  metaTitle: '', metaDescription: '', ogImage: '', canonicalUrl: '',
  featured: false, isCinematic: false,
};

export default function AdminStoryEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { currentUser } = useAdminAuth();
  const isNew = !id;

  const [allAuthors, setAllAuthors] = useState<AdminAuthor[]>([]);
  const [allTags, setAllTags]       = useState<string[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  // Local Helpers to avoid circular dependency
  const countWords = (html: string) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]+>/g, '');
    const cleanText = text.trim();
    if (!cleanText) return 0;
    return cleanText.split(/\s+/).filter(w => w.length > 0).length;
  };

  const calculateReadingTime = (html: string) => {
    const words = countWords(html);
    if (words === 0) return 0;
    const wordsPerMinute = 225;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
  };

  const stripBase64 = (html: string) => {
    if (!html || typeof html !== 'string') return html;
    return html.replace(/src=["']data:image[^"']*["']/gi, 'src=""');
  };

  const [form, setForm]         = useState<FormState>(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty]       = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [article, setArticle]   = useState<AdminArticle | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  
  // Undo/Redo stack
  const [undoStack, setUndoStack] = useState<FormState[]>([]);
  const [redoStack, setRedoStack] = useState<FormState[]>([]);

  // UI panels
  const [showSEO, setShowSEO]           = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [showNotes, setShowNotes]       = useState(false);
  const [newNote, setNewNote]           = useState('');
  const [noteType, setNoteType]         = useState<InternalNote['type']>('note');
  const [restoreTarget, setRestoreTarget] = useState<ArticleRevision | null>(null);

  const applyArticleToForm = useCallback((a: AdminArticle) => {
    if (!a) return;
    console.log(`📡 Applying article to form: ${a.headline} (Body length: ${a.body?.length ?? 0})`);
    setArticle(a);
    setForm({
      headline: a.headline || '', 
      dek: a.dek || '', 
      body: a.body || '',
      image: a.image || '', 
      imageCaption: a.imageCaption || '',
      section: a.section, authorId: a.author.id, tags: a.tags,
      slug: a.slug, status: a.status,
      publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      assignedToId: a.assignedToId ?? '',
      deadline: a.deadline ? a.deadline.slice(0, 10) : '',
      priority: a.priority ?? 'normal',
      pitchSummary: a.pitchSummary ?? '',
      metaTitle: a.metaTitle ?? '',
      metaDescription: a.metaDescription ?? '',
      ogImage: a.ogImage ?? '',
      canonicalUrl: a.canonicalUrl ?? '',
      featured: a.featured ?? false,
      isCinematic: a.isCinematic ?? false,
    });
    setLastSaved(a.updatedAt ? new Date(a.updatedAt) : null);
  }, []);

  // MASTER INITIALIZATION (Dynamic Imports to break circular loops)
  useEffect(() => {
    async function init() {
      try {
        const adminData = await import('@/lib/adminDataService');
        const { getUsersList } = await import('@/lib/adminUserService');

        // 1. Authors
        const byId = new Map<string, AdminAuthor>();
        jsonAuthors.forEach(a => byId.set(a.id, {
          id: a.id, name: a.name, role: a.role, bio: a.bio,
          image: a.image, email: a.email, twitter: a.twitter,
        }));
        adminData.getAdminAuthorsList().forEach(a => byId.set(a.id, a));
        
        const dedupedAuthors: AdminAuthor[] = [];
        const seenNames = new Set<string>();
        Array.from(byId.values()).forEach(author => {
          const normalizedName = author.name.trim().toLowerCase();
          if (!seenNames.has(normalizedName)) {
            seenNames.add(normalizedName);
            dedupedAuthors.push(author);
          }
        });
        setAllAuthors(dedupedAuthors.sort((a, b) => a.name.localeCompare(b.name)));

        // 2. Tags
        setAllTags(adminData.getAllAdminTags());

        // 3. Staff
        setStaffUsers(getUsersList().filter(u => u.active));

        // 4. Load Article or PDF Prefill
        if (id) {
          const a = adminData.getAdminArticle(id);
          if (a) {
            if (isSupabaseConfigured() && a.body === '') {
              setLoadingFull(true);
              setArticle(a);
              applyArticleToForm(a);
              // Body fetched in next effect
            } else {
              applyArticleToForm(a);
              setLoaded(true);
            }
          } else if (isSupabaseConfigured()) {
            setLoadingFull(true);
          } else {
            toast.error('Article not found');
            navigate('/admin/stories');
          }
        } else {
          // Check for PDF pre-fill
          const raw = sessionStorage.getItem('pdf_prefill');
          if (raw) {
            try {
              const prefill = JSON.parse(raw);
              sessionStorage.removeItem('pdf_prefill');
              setForm(prev => ({
                ...prev,
                headline: prefill.headline ?? prev.headline,
                body: prefill.body ?? prev.body,
                slug: prefill.headline ? generateSlug(prefill.headline) : prev.slug,
              }));
              toast.success('Story pre-filled from PDF import');
            } catch {
              sessionStorage.removeItem('pdf_prefill');
            }
          }
          setLoaded(true);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        toast.error('Failed to initialize editor. Please refresh.');
      }
    }
    init();
  }, [id, navigate, applyArticleToForm]);

  // Supabase full body fetch
  useEffect(() => {
    if (!id || !loadingFull || !isSupabaseConfigured()) return;
    let cancelled = false;
    console.log(`📡 Triggering full body fetch for ${id}...`);
    getArticleByIdFromSupabase(id)
      .then((full) => {
        if (cancelled) return;
        if (!full) {
          console.error('❌ Full article not found in Supabase');
          toast.error('Article not found in cloud storage.');
          setLoaded(true); // Still set loaded so they see the empty state instead of infinite loader
          return;
        }
        applyArticleToForm(full);
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('❌ Supabase fetch failed:', err);
          toast.error('Failed to load article from cloud.');
          setLoaded(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFull(false);
      });
    return () => { cancelled = true; };
  }, [id, loadingFull, applyArticleToForm]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => {
      setUndoStack(stack => [...stack, prev].slice(-50));
      setRedoStack([]);
      const next = { ...prev, [key]: value };
      if (key === 'headline' && isNew && prev.slug === generateSlug(prev.headline)) {
        next.slug = generateSlug(value as string);
      }
      return next;
    });
    setDirty(true);
  }, [isNew]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    setForm(current => {
      setRedoStack(stack => [current, ...stack].slice(0, 50));
      const previous = undoStack[undoStack.length - 1];
      setUndoStack(stack => stack.slice(0, -1));
      return previous;
    });
    setDirty(true);
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    setForm(current => {
      setUndoStack(stack => [...stack, current].slice(-50));
      const next = redoStack[0];
      setRedoStack(stack => stack.slice(1));
      return next;
    });
    setDirty(true);
  }, [redoStack]);

  const readingTime = useMemo(() => calculateReadingTime(form.body), [form.body]);
  const wordCount   = useMemo(() => countWords(form.body), [form.body]);

  const buildArticle = (status: WorkflowStatus): AdminArticle => {
    const author = allAuthors.find(a => a.id === form.authorId) ?? {
      id: form.authorId || 'unknown',
      name: 'Unknown Author', role: 'Student Journalist', bio: '',
      image: `https://ui-avatars.com/api/?name=Unknown&size=200`,
    };
    const assignedUser = staffUsers.find(u => u.id === form.assignedToId);
    return {
      id: id ?? '',
      slug: form.slug || generateSlug(form.headline),
      headline: form.headline, dek: form.dek, body: stripBase64(form.body),
      image: form.image, images: form.image ? [form.image] : [],
      imageCaption: form.imageCaption,
      section: form.section, author, readingTime, tags: form.tags, status,
      publishedAt: new Date(form.publishedAt).toISOString(),
      assignedToId: form.assignedToId || undefined,
      assignedToName: assignedUser?.displayName || undefined,
      deadline: form.deadline || undefined,
      priority: form.priority,
      pitchSummary: form.pitchSummary || undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      ogImage: form.ogImage || undefined,
      canonicalUrl: form.canonicalUrl || undefined,
      featured: form.featured || undefined,
      isCinematic: form.isCinematic || undefined,
      internalNotes: article?.internalNotes ?? [],
      revisions: article?.revisions ?? [],
    };
  };

  /**
   * Say what actually happened, in words a non-technical editor can act on.
   *
   * The three cases are genuinely different and used to collapse into one
   * cheerful "Saved": the story is live, the story is saved but not live, or
   * the story was saved and the push to the public site failed — which is the
   * one an editor must not miss, because everything on screen still looks fine.
   */
  const reportSave = (
    status: WorkflowStatus,
    publish: import('@/lib/adminDataService').PublishResult | null,
  ) => {
    if (publish && !publish.ok) {
      toast.error('Saved, but the public site was not updated', {
        description: publish.reason,
        duration: 12000,
      });
      return;
    }
    if (status === 'published') {
      toast.success('Published — readers can see this now.');
    } else if (publish?.ok) {
      toast.success(`Saved as ${WORKFLOW_LABELS[status] ?? status} — it is off the public site now.`);
    } else {
      toast.success(`Saved as ${WORKFLOW_LABELS[status] ?? status}.`);
    }
  };

  const doSave = async (status: WorkflowStatus, silent = false) => {
    setSaving(true);
    // Saving the row and updating the public site are two separate things, and
    // the second one used to fail in silence — the editor was told readers could
    // see the story when the push had never landed. Whatever comes back here is
    // what the editor gets told.
    let publish: import('@/lib/adminDataService').PublishResult | null = null;
    const onPublish = (r: import('@/lib/adminDataService').PublishResult) => { publish = r; };
    try {
      const adminData = await import('@/lib/adminDataService');
      const built = buildArticle(status);
      const userId   = currentUser?.id;
      const userName = currentUser?.displayName;

      // Publish and Unpublish set the status directly. Without this the
      // dropdown kept showing the old value after the button was pressed, so a
      // live story sat there labelled "Draft" and the next Save put it back.
      if (status !== form.status) setForm(prev => ({ ...prev, status }));

      if (isNew || !id) {
        const created = await adminData.createAdminArticle(built, userId, userName, { onPublish });
        setDirty(false);
        setLastSaved(new Date());
        setArticle(created);
        navigate(`/admin/stories/edit/${created.id}`, { replace: true });
        logActivity('article_created', `"${built.headline}" created`, userId, created.id);
        if (!silent) reportSave(status, publish);
      } else {
        const saved = await adminData.saveAdminArticle({ ...built, id }, userId, userName, undefined, { onPublish });
        setDirty(false);
        setLastSaved(new Date());
        setArticle(saved);
        // The work is on the server now, so the local recovery copy is stale.
        try { localStorage.removeItem(`octagon_editor_recovery_${id}`); } catch { /* non-fatal */ }
        logActivity('article_saved', `"${built.headline}" updated`, userId, id);
        if (!silent) reportSave(status, publish);
      }
    } catch (err) {
      console.error(err);
      if (!silent) toast.error(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    const adminData = await import('@/lib/adminDataService');
    const updated = adminData.addInternalNote(id, {
      authorId:   currentUser?.id   ?? 'unknown',
      authorName: currentUser?.displayName ?? 'Unknown',
      content: newNote.trim(),
      type: noteType,
    });
    if (updated) { setArticle(updated); setNewNote(''); toast.success('Note added'); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;
    const adminData = await import('@/lib/adminDataService');
    adminData.deleteInternalNote(id, noteId);
    const updated = adminData.getAdminArticle(id);
    if (updated) setArticle(updated);
    toast.success('Note deleted');
  };

  const handleRestoreRevision = async () => {
    if (!restoreTarget || !id) return;
    const adminData = await import('@/lib/adminDataService');
    const restored = await adminData.restoreRevision(id, restoreTarget.id, currentUser?.id ?? '', currentUser?.displayName ?? '');
    if (restored) {
      applyArticleToForm(restored);
      toast.success('Revision restored');
    }
    setRestoreTarget(null);
  };

  // Is this story currently visible to readers?
  const isLive = form.status === 'published';

  // Local recovery copy, used only while editing a LIVE story (where we refuse
  // to autosave to the server). Nothing is lost if the tab closes.
  const recoveryKey = id ? `octagon_editor_recovery_${id}` : null;

  const clearRecovery = useCallback(() => {
    if (!recoveryKey) return;
    try { localStorage.removeItem(recoveryKey); } catch { /* non-fatal */ }
  }, [recoveryKey]);

  /**
   * Autosave.
   *
   * This used to call doSave(form.status) — so editing a PUBLISHED story
   * re-published it every 5 seconds, pushing half-finished edits to readers and
   * firing a full site re-sync each time. A live story is now never written to
   * the server automatically; the editor decides when readers see the change.
   */
  useEffect(() => {
    if (!dirty || !loaded || !form.headline.trim()) return;

    const timer = setTimeout(() => {
      if (isLive) {
        if (!recoveryKey) return;
        try {
          localStorage.setItem(recoveryKey, JSON.stringify({ form, at: Date.now() }));
        } catch { /* quota — non-fatal */ }
      } else {
        doSave(form.status, true);
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, loaded, isLive, recoveryKey]);

  // Warn before losing unsaved changes to a live story.
  useEffect(() => {
    if (!dirty || !isLive) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, isLive]);

  const noteTypeColors: Record<InternalNote['type'], string> = {
    note: 'bg-slate-100 text-slate-700',
    feedback: 'bg-blue-100 text-blue-700',
    approval: 'bg-green-100 text-green-700',
    rejection: 'bg-red-100 text-red-700',
  };

  if (loadingFull) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        <p className="text-slate-600 font-medium">Fetching full article content from cloud…</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/admin/stories">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />Stories
              </Button>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-medium text-slate-700">{isNew ? 'New Story' : 'Edit Story'}</span>
            {dirty && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {isLive
                  ? 'Unsaved — readers still see the old version'
                  : 'Unsaved changes'}
              </span>
            )}
            {isLive && !dirty && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                Live on the site
              </span>
            )}
            {lastSaved && !dirty && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 mr-1">
              <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoStack.length === 0 || saving} className="h-8 w-8 p-0">
                <Undo2 className={cn('h-4 w-4', undoStack.length === 0 && 'text-slate-300')} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRedo} disabled={redoStack.length === 0 || saving} className="h-8 w-8 p-0">
                <Redo2 className={cn('h-4 w-4', redoStack.length === 0 && 'text-slate-300')} />
              </Button>
            </div>
            <DocxImporter onImport={({ headline, body, byline }) => {
              if (headline) updateField('headline', headline);
              if (body) updateField('body', body);
              if (byline) {
                const match = allAuthors.find(a => a.name.toLowerCase().includes(byline.toLowerCase()));
                if (match) updateField('authorId', match.id);
              }
            }} />
            {/* Preview: wait for the save to finish rather than racing it on a
                150ms timer, which could open a stale or not-yet-existing slug. */}
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500" disabled={!form.headline.trim() || saving}
              onClick={async () => {
                await doSave(form.status, true);
                const slug = form.slug || generateSlug(form.headline);
                window.open(`/article/${slug}?preview=1`, '_blank');
              }}>
              <Eye className="h-4 w-4" />Preview
            </Button>

            {/* Save writes whatever the Status dropdown says. It used to force
                'published' or 'draft', so a reporter who set their story to
                Submitted and clicked Save had it quietly filed back to Draft —
                the editor never saw it in the queue and the work looked
                ignored. Eight statuses in the dropdown means eight statuses
                this button can save. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => doSave(form.status)}
              disabled={saving || !form.headline.trim()}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isLive ? 'Save changes' : `Save as ${WORKFLOW_LABELS[form.status]}`}
            </Button>

            {isLive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => doSave('draft')}
                disabled={saving}
                className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                title="Remove this story from the public site and keep it as a draft"
              >
                Unpublish
              </Button>
            ) : (
              <Button size="sm" onClick={() => doSave('published')} disabled={saving || !form.headline.trim()} className="gap-1.5">
                <Send className="h-4 w-4" />Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <input type="text" value={form.headline} onChange={(e) => updateField('headline', e.target.value)}
              placeholder="Headline…" className="w-full text-4xl font-serif font-bold text-slate-900 bg-transparent border-0 outline-none" />
            
            <Textarea value={form.dek} onChange={(e) => updateField('dek', e.target.value)}
              placeholder="Subheadline / Dek…" className="text-xl text-slate-600 bg-transparent border-0 p-0" rows={2} />

            <div className="h-px bg-slate-200" />

            <RichTextEditor value={form.body} onChange={(html) => updateField('body', html)} placeholder="Body…" />
            <p className="text-xs text-slate-400 mt-2">{readingTime} min read · {wordCount} words</p>

            {/* Notes & Revisions Panel */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setShowNotes(!showNotes)} className="w-full flex items-center justify-between px-5 py-4">
                <span className="text-sm font-medium">Internal Notes ({article?.internalNotes?.length || 0})</span>
                {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showNotes && (
                <div className="p-5 border-t border-slate-100 space-y-4">
                  <div className="flex gap-2">
                    <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add note…" rows={2} />
                    <Button size="sm" onClick={handleAddNote}>Add</Button>
                  </div>
                  <div className="space-y-2">
                    {article?.internalNotes?.map(note => (
                      <div key={note.id} className="p-3 bg-slate-50 rounded-lg text-sm">
                        <div className="flex justify-between mb-1 text-xs text-slate-500">
                          <span>{note.authorName}</span>
                          <button onClick={() => handleDeleteNote(note.id)}><Trash2 className="h-3 w-3" /></button>
                        </div>
                        {note.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Status</Label>
                <Select value={form.status} onValueChange={(v) => updateField('status', v as WorkflowStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORKFLOW_LABELS).map(([val, lab]) => (
                      <SelectItem key={val} value={val}>{lab}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Author</Label>
                <Select value={form.authorId} onValueChange={(v) => updateField('authorId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allAuthors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Section</Label>
                <Select value={form.section} onValueChange={(v) => updateField('section', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sections.map(s => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Publish date and slug were part of the saved article all along
                  but had no inputs, so nobody could set the date a story is
                  dated, or fix an ugly auto-generated URL. */}
              <div>
                <Label htmlFor="publishedAt" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                  Story date
                </Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => updateField('publishedAt', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Shown on the story and used to order the homepage.
                </p>
              </div>

              <div>
                <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                  Web address
                </Label>
                <Input
                  id="slug"
                  value={form.slug}
                  placeholder={generateSlug(form.headline) || 'auto-generated-from-headline'}
                  onChange={(e) => updateField('slug', e.target.value)}
                />
                <p className="mt-1 truncate text-xs text-slate-400">
                  /article/{form.slug || generateSlug(form.headline) || '…'}
                </p>
              </div>
            </div>

            {/* Search & share text. The fields existed in the data model and
                were saved, but were never rendered — so every story shipped
                with whatever the site defaults were. */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setShowSEO(v => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Search &amp; social preview
                </span>
                <span className="text-xs text-slate-400">{showSEO ? 'Hide' : 'Edit'}</span>
              </button>

              {showSEO && (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="metaTitle" className="text-xs text-slate-500 mb-1.5 block">
                      Title in Google / when shared
                    </Label>
                    <Input
                      id="metaTitle"
                      value={form.metaTitle}
                      placeholder={form.headline || 'Defaults to the headline'}
                      maxLength={70}
                      onChange={(e) => updateField('metaTitle', e.target.value)}
                    />
                    <p className="mt-1 text-xs text-slate-400">{form.metaTitle.length}/70 — longer titles get cut off.</p>
                  </div>

                  <div>
                    <Label htmlFor="metaDescription" className="text-xs text-slate-500 mb-1.5 block">
                      Short description
                    </Label>
                    <Textarea
                      id="metaDescription"
                      value={form.metaDescription}
                      placeholder={form.dek || 'Defaults to the summary line'}
                      maxLength={160}
                      rows={3}
                      onChange={(e) => updateField('metaDescription', e.target.value)}
                    />
                    <p className="mt-1 text-xs text-slate-400">{form.metaDescription.length}/160</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-violet-50 rounded-xl border border-violet-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-violet-900">Featured on Homepage</Label>
                <Switch checked={form.featured} onCheckedChange={(v) => updateField('featured', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  <Label className="text-sm font-semibold text-violet-900">Cinematic Mode</Label>
                </div>
                <Switch checked={form.isCinematic} onCheckedChange={(v) => updateField('isCinematic', v)} />
              </div>
            </div>

            <ImageUpload value={form.image} onChange={(url) => updateField('image', url)} caption={form.imageCaption} onCaptionChange={(v) => updateField('imageCaption', v)} />
            
            <TagInput value={form.tags} onChange={(t) => updateField('tags', t)} suggestions={allTags} />
          </div>
        </div>
      </div>

      <Dialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restore Revision?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>Cancel</Button>
            <Button onClick={handleRestoreRevision}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
