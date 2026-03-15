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
  Undo2, Redo2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminArticle, saveAdminArticle, createAdminArticle,
  generateSlug, calculateReadingTime, countWords, getAllAdminTags,
  addInternalNote, deleteInternalNote, restoreRevision,
  type AdminArticle, type AdminAuthor, type InternalNote, type ArticleRevision,
  getAdminAuthorsList, WORKFLOW_LABELS,
} from '@/lib/adminDataService';
import { getArticleByIdFromSupabase } from '@/lib/supabaseDataService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { getUsersList, ROLE_LABELS, logActivity } from '@/lib/adminUserService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { authors as jsonAuthors, sections } from '@/data/seedData';
import { cn } from '@/lib/utils';

const AUTOSAVE_DELAY = 5000;

function getAllAuthors(): AdminAuthor[] {
  // First pass: deduplicate by ID (admin authors override seed authors)
  const byId = new Map<string, AdminAuthor>();
  jsonAuthors.forEach(a => byId.set(a.id, {
    id: a.id, name: a.name, role: a.role, bio: a.bio,
    image: a.image, email: a.email, twitter: a.twitter,
  }));
  getAdminAuthorsList().forEach(a => byId.set(a.id, a));
  
  // Second pass: deduplicate by normalized name (case-insensitive, trimmed)
  // If multiple authors have the same name, keep only the first one encountered
  const result: AdminAuthor[] = [];
  const seenNames = new Set<string>();
  
  Array.from(byId.values()).forEach(author => {
    const normalizedName = author.name.trim().toLowerCase();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      result.push(author);
    }
    // Skip if name already seen (duplicate name, different ID)
  });
  
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

type WorkflowStatus = AdminArticle['status'];
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
}

const emptyForm: FormState = {
  headline: '', dek: '', body: '', image: '', imageCaption: '',
  section: 'us', authorId: '', tags: [], slug: '', status: 'draft',
  publishedAt: new Date().toISOString().slice(0, 16),
  assignedToId: '', deadline: '', priority: 'normal', pitchSummary: '',
  metaTitle: '', metaDescription: '', ogImage: '', canonicalUrl: '',
  featured: false,
};

export default function AdminStoryEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { currentUser } = useAdminAuth();
  const isNew = !id;

  const allAuthors = useMemo(getAllAuthors, []);
  const allTags    = useMemo(getAllAdminTags, []);
  const staffUsers = useMemo(() => getUsersList().filter(u => u.active), []);

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

  function applyArticleToForm(a: AdminArticle) {
    setArticle(a);
    setForm({
      headline: a.headline, dek: a.dek, body: a.body,
      image: a.image, imageCaption: a.imageCaption,
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
    });
    setLastSaved(a.updatedAt ? new Date(a.updatedAt) : null);
  }

  // Load article (list-only from cache first; full body fetched in next effect when Supabase)
  useEffect(() => {
    if (id) {
      const a = getAdminArticle(id);
      if (a) {
        if (isSupabaseConfigured() && a.body === '') {
          setLoadingFull(true);
          setArticle(a);
          setForm({
            headline: a.headline, dek: a.dek, body: '',
            image: a.image, imageCaption: a.imageCaption,
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
          });
          setLastSaved(a.updatedAt ? new Date(a.updatedAt) : null);
        } else {
          applyArticleToForm(a);
        }
      } else {
        toast.error('Article not found');
        navigate('/admin/stories');
      }
    } else {
      // Check for PDF pre-fill data (from PDF Import tool)
      const raw = sessionStorage.getItem('pdf_prefill');
      if (raw) {
        try {
          const prefill = JSON.parse(raw) as { headline?: string; byline?: string; body?: string };
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
    }
    setLoaded(true);
  }, [id, navigate]);

  // When Supabase and list-only article (empty body), fetch full article to reduce egress
  useEffect(() => {
    if (!id || !loadingFull || !isSupabaseConfigured()) return;
    let cancelled = false;
    getArticleByIdFromSupabase(id)
      .then((full) => {
        if (cancelled || !full) return;
        applyArticleToForm(full);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load full article');
      })
      .finally(() => {
        if (!cancelled) setLoadingFull(false);
      });
    return () => { cancelled = true; };
  }, [id, loadingFull]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => {
      // Push current state to undo stack before making changes
      setUndoStack(stack => [...stack, prev].slice(-50)); // Keep last 50 states
      setRedoStack([]); // Clear redo stack on new edit
      
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

  // Autosave
  useEffect(() => {
    if (!dirty || !loaded) return;
    const timer = setTimeout(() => {
      if (form.headline.trim()) doSave(form.status, true);
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, loaded]);

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
      headline: form.headline, dek: form.dek, body: form.body,
      image: form.image, images: form.image ? [form.image] : [],
      imageCaption: form.imageCaption,
      section: form.section, author, readingTime, tags: form.tags, status,
      publishedAt: new Date(form.publishedAt).toISOString(),
      // Workflow
      assignedToId: form.assignedToId || undefined,
      assignedToName: assignedUser?.displayName || undefined,
      deadline: form.deadline || undefined,
      priority: form.priority,
      pitchSummary: form.pitchSummary || undefined,
      // SEO
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      ogImage: form.ogImage || undefined,
      canonicalUrl: form.canonicalUrl || undefined,
      featured: form.featured || undefined,
      // Preserve existing notes / revisions
      internalNotes: article?.internalNotes ?? [],
      revisions: article?.revisions ?? [],
    };
  };

  const doSave = async (status: WorkflowStatus, silent = false) => {
    setSaving(true);
    try {
      const built = buildArticle(status);
      const userId   = currentUser?.id;
      const userName = currentUser?.displayName;

      if (isNew || !id) {
        const created = createAdminArticle(built, userId, userName);
        setDirty(false);
        setLastSaved(new Date());
        setArticle(created);
        if (!silent) {
          toast.success(status === 'published' ? 'Story published!' : 'Draft saved!');
        }
        // Always navigate after first creation — even on silent autosave —
        // so subsequent saves UPDATE the article instead of creating duplicates
        navigate(`/admin/stories/edit/${created.id}`, { replace: true });
        logActivity('article_created', `"${built.headline}" created`, userId, created.id);
      } else {
        // HEADLESS CMS: Wait for Supabase save (single source of truth)
        const saved = await saveAdminArticle({ ...built, id }, userId, userName);
        setDirty(false);
        setLastSaved(new Date());
        setArticle(saved);
        if (!silent) {
          toast.success(
            status === 'published' ? 'Story published! Available on all devices.' :
            status === 'archived'  ? 'Story archived.'  :
            status === 'submitted' ? 'Submitted for review!' :
            'Saved! Available on all devices.'
          );
        }
        logActivity('article_saved', `"${built.headline}" updated (${WORKFLOW_LABELS[status]})`, userId, id);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        const message = err instanceof Error && err.message.includes('quota')
          ? 'Storage full: Image too large. Please use an image URL instead of uploading directly, or use a smaller image.'
          : err instanceof Error
          ? err.message
          : 'Failed to save. Please try again.';
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    if (!form.headline.trim()) { toast.error('Headline is required.'); return; }
    if (!form.body.trim())     { toast.error('Article body is required.'); return; }
    if (!form.authorId)        { toast.error('Please select an author.'); return; }
    doSave('published');
  };

  const handleSubmitForReview = () => {
    if (!form.headline.trim()) { toast.error('Headline is required.'); return; }
    doSave('submitted');
  };

  // Notes
  const handleAddNote = () => {
    if (!newNote.trim() || !id) return;
    const updated = addInternalNote(id, {
      authorId:   currentUser?.id   ?? 'unknown',
      authorName: currentUser?.displayName ?? 'Unknown',
      content: newNote.trim(),
      type: noteType,
    });
    if (updated) { setArticle(updated); setNewNote(''); toast.success('Note added'); }
  };

  const handleDeleteNote = (noteId: string) => {
    if (!id) return;
    deleteInternalNote(id, noteId);
    const updated = getAdminArticle(id);
    if (updated) setArticle(updated);
    toast.success('Note deleted');
  };

  // Revisions
  const handleRestoreRevision = () => {
    if (!restoreTarget || !id) return;
    const restored = restoreRevision(id, restoreTarget.id, currentUser?.id ?? '', currentUser?.displayName ?? '');
    if (restored) {
      setArticle(restored);
      setForm(prev => ({ ...prev, headline: restored.headline, body: restored.body, status: restored.status }));
      toast.success('Revision restored');
    }
    setRestoreTarget(null);
  };

  const noteTypeColors: Record<InternalNote['type'], string> = {
    note:       'bg-slate-100 text-slate-700',
    feedback:   'bg-blue-100 text-blue-700',
    approval:   'bg-green-100 text-green-700',
    rejection:  'bg-red-100 text-red-700',
  };

  if (!loaded) return null;

  if (loadingFull) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading article…</p>
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
            {dirty && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Unsaved changes</span>}
            {lastSaved && !dirty && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5 border-r border-slate-200 pr-2 mr-1">
              <Button variant="ghost" size="sm" onClick={handleUndo}
                disabled={undoStack.length === 0 || saving}
                className="h-8 w-8 p-0"
                title="Undo (⌘Z)">
                <Undo2 className={cn('h-4 w-4', undoStack.length === 0 && 'text-slate-300')} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRedo}
                disabled={redoStack.length === 0 || saving}
                className="h-8 w-8 p-0"
                title="Redo (⌘⇧Z)">
                <Redo2 className={cn('h-4 w-4', redoStack.length === 0 && 'text-slate-300')} />
                </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-slate-500"
              disabled={!form.headline.trim() || saving}
              title={!form.headline.trim() ? 'Enter a headline first' : 'Save & preview article'}
              onClick={() => {
                // Save first so the latest content is persisted, then open preview
                const slug = form.slug || generateSlug(form.headline);
                doSave('draft', true);
                // Small timeout to ensure localStorage write completes before new tab loads
                setTimeout(() => window.open(`/article/${slug}?preview=1`, '_blank'), 150);
              }}
            >
              <Eye className="h-4 w-4" />Preview
            </Button>
            <Button variant="outline" size="sm" onClick={handleSubmitForReview}
              disabled={saving || !form.headline.trim()} className="gap-1.5">
              Submit for Review
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => doSave('draft')} disabled={saving || !form.headline.trim()} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Headline */}
              <input
              type="text" value={form.headline}
                onChange={(e) => updateField('headline', e.target.value)}
                placeholder="Write your headline…"
                className="w-full text-3xl font-serif font-bold text-slate-900 bg-transparent border-0 outline-none placeholder:text-slate-300 leading-tight"
              />

            {/* Dek */}
            <Textarea value={form.dek} onChange={(e) => updateField('dek', e.target.value)}
                placeholder="Write a brief summary (dek / subheadline)…"
                className="text-lg text-slate-600 bg-transparent border-0 resize-none min-h-[60px] focus-visible:ring-0 p-0 placeholder:text-slate-300"
                rows={2}
            />

            {/* Pitch Summary */}
            {(form.status === 'pitch' || form.pitchSummary) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2 block">
                  Pitch / Story Summary
                </Label>
                <Textarea value={form.pitchSummary}
                  onChange={(e) => updateField('pitchSummary', e.target.value)}
                  placeholder="Briefly describe the story idea, angle, and why it matters…"
                  className="bg-white min-h-[80px] text-sm" rows={3}
              />
            </div>
            )}

            <div className="h-px bg-slate-200" />

            {/* Rich Text Editor */}
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Article Body</Label>
              <RichTextEditor value={form.body} onChange={(html) => updateField('body', html)}
                placeholder="Write your article…" />
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {readingTime} min read · {wordCount.toLocaleString()} words
              </p>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-xl border border-slate-200">
              <button onClick={() => setShowNotes(!showNotes)}
                className="w-full flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Editorial Notes {article?.internalNotes?.length ? `(${article.internalNotes.length})` : ''}
                  </span>
                </div>
                {showNotes ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showNotes && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  {/* Add Note */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select value={noteType} onValueChange={(v) => setNoteType(v as InternalNote['type'])}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="feedback">Feedback</SelectItem>
                          <SelectItem value="approval">Approval</SelectItem>
                          <SelectItem value="rejection">Rejection</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add an editorial note…" className="text-sm min-h-[60px]" rows={2} />
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAddNote}
                      disabled={!newNote.trim() || !id} className="gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />Add Note
                    </Button>
                  </div>
                  {/* Notes list */}
                  {(article?.internalNotes ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {(article!.internalNotes!).map(note => (
                        <div key={note.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full', noteTypeColors[note.type])}>
                                {note.type}
                              </span>
                              <span className="text-xs font-medium text-slate-700">{note.authorName}</span>
                              <span className="text-xs text-slate-400">
                                {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700">{note.content}</p>
                          </div>
                          {currentUser?.id === note.authorId && (
                            <button onClick={() => handleDeleteNote(note.id)}
                              className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No editorial notes yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Revision History */}
            {!isNew && (
              <div className="bg-white rounded-xl border border-slate-200">
                <button onClick={() => setShowRevisions(!showRevisions)}
                  className="w-full flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">
                      Revision History {article?.revisions?.length ? `(${article.revisions.length})` : ''}
                    </span>
                  </div>
                  {showRevisions ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {showRevisions && (
                  <div className="border-t border-slate-100">
                    {(article?.revisions ?? []).length === 0 ? (
                      <p className="px-5 py-4 text-xs text-slate-400 italic">No revisions saved yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {(article!.revisions!).map(rev => (
                          <div key={rev.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 truncate">{rev.headline}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {rev.savedByName} · {new Date(rev.savedAt).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                })} · {WORKFLOW_LABELS[rev.status]}
                              </p>
                              {rev.note && <p className="text-xs text-slate-500 italic mt-0.5">{rev.note}</p>}
                            </div>
                            <Button size="sm" variant="outline" className="text-xs h-7 shrink-0"
                              onClick={() => setRestoreTarget(rev)}>
                              Restore
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v as WorkflowStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pitch">Pitch</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted for Review</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority & Deadline */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => updateField('priority', v as ArticlePriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="breaking">🔴 Breaking News</SelectItem>
                  </SelectContent>
                </Select>
                {form.priority === 'breaking' && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />Breaking stories appear in alerts.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Deadline</Label>
                <Input type="date" value={form.deadline}
                  onChange={(e) => updateField('deadline', e.target.value)}
                  className={cn(form.deadline && new Date(form.deadline) < new Date() ? 'border-red-300 text-red-600' : '')}
                />
                {form.deadline && new Date(form.deadline) < new Date() && (
                  <p className="text-xs text-red-500 mt-1">This deadline has passed.</p>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <Label className="text-sm font-semibold text-slate-700 block">Assignment</Label>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Assigned Reporter</Label>
                <Select value={form.assignedToId || '__none__'} onValueChange={(v) => updateField('assignedToId', v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Assign to…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {staffUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.displayName} — {ROLE_LABELS[u.role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1.5 block">Byline Author</Label>
                <Select value={form.authorId} onValueChange={(v) => updateField('authorId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select author…" /></SelectTrigger>
                  <SelectContent>
                    {allAuthors.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Section</Label>
              <Select value={form.section} onValueChange={(v) => updateField('section', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sections.map(s => (
                    <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Homepage Feature */}
            {form.status === 'published' && (
              <div className="bg-violet-50 rounded-xl border border-violet-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-violet-900 block mb-1">
                      Feature on Homepage
                    </Label>
                    <p className="text-xs text-violet-700">
                      When enabled, this story appears as the main featured story on the homepage
                    </p>
                  </div>
                  <Switch
                    checked={form.featured}
                    onCheckedChange={(checked) => updateField('featured', checked)}
                  />
                </div>
            </div>
            )}

            {/* Featured Image */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <ImageUpload
                value={form.image}
                onChange={(url) => updateField('image', url)}
                caption={form.imageCaption}
                onCaptionChange={(cap) => updateField('imageCaption', cap)}
              />
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">Tags</Label>
              <TagInput value={form.tags} onChange={(tags) => updateField('tags', tags)}
                suggestions={allTags} placeholder="Add tags…" />
            </div>

            {/* Slug & Publish Date */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">URL Slug</Label>
                <Input value={form.slug} onChange={(e) => updateField('slug', e.target.value)}
                  placeholder="auto-generated-from-headline" />
                <p className="text-xs text-slate-400 mt-1.5">/article/{form.slug || 'your-slug-here'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Publish Date</Label>
                <Input type="datetime-local" value={form.publishedAt}
                  onChange={(e) => updateField('publishedAt', e.target.value)} />
              </div>
            </div>

            {/* SEO Panel */}
            <div className="bg-white rounded-xl border border-slate-200">
              <button onClick={() => setShowSEO(!showSEO)}
                className="w-full flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">SEO Settings</span>
                </div>
                {showSEO ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showSEO && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  <div>
                    <Label className="text-xs text-slate-600 mb-1.5 block">SEO Title <span className="text-slate-400">(overrides headline)</span></Label>
                    <Input value={form.metaTitle} onChange={(e) => updateField('metaTitle', e.target.value)}
                      placeholder={form.headline || 'SEO title…'} maxLength={70} />
                    <p className="text-xs text-slate-400 mt-1">{form.metaTitle.length}/70 characters</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1.5 block">Meta Description</Label>
                    <Textarea value={form.metaDescription}
                      onChange={(e) => updateField('metaDescription', e.target.value)}
                      placeholder="Brief description for search engines…" maxLength={160} rows={3}
                      className="text-sm" />
                    <p className="text-xs text-slate-400 mt-1">{form.metaDescription.length}/160 characters</p>
                  </div>
                  <div>
                    <ImageUpload
                      value={form.ogImage}
                      onChange={(url) => updateField('ogImage', url)}
                      label="Social Share Image (OG Image)"
                    />
                    <p className="text-xs text-slate-400 mt-1">Used when sharing on social media. Defaults to story image if empty.</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 mb-1.5 block">Canonical URL <span className="text-slate-400">(optional)</span></Label>
                    <Input value={form.canonicalUrl} onChange={(e) => updateField('canonicalUrl', e.target.value)}
                      placeholder="https://…" />
                  </div>
                  {/* Preview */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Google Preview</p>
                    <p className="text-sm font-medium text-blue-700 truncate">
                      {form.metaTitle || form.headline || 'Article Title'}
                    </p>
                    <p className="text-xs text-green-700 truncate">
                      thedailystandard.org/article/{form.slug || 'your-slug'}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                      {form.metaDescription || form.dek || 'Article description will appear here…'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restore Revision Dialog */}
      <Dialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Revision</DialogTitle>
            <DialogDescription>
              Restore from{' '}
              {restoreTarget && new Date(restoreTarget.savedAt).toLocaleString('en-US', {
                month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}? Your current unsaved changes will be overwritten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)}>Cancel</Button>
            <Button onClick={handleRestoreRevision}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
