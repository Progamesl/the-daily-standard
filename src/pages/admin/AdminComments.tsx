import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, Trash2, Search, MessageSquare, Clock, RefreshCw } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  article_id: string;
  display_name: string;
  content: string;
  approved: boolean;
  created_at: string;
  article_headline?: string;
  article_slug?: string;
}

type FilterTab = 'pending' | 'approved' | 'all';

export default function AdminComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [query, setQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Comment | null>(null);

  const fetchComments = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Enrich with article headline where possible
      const enriched = await Promise.all(
        (data || []).map(async (c) => {
          try {
            const { data: article } = await supabase!
              .from('articles')
              .select('headline, slug')
              .eq('id', c.article_id)
              .maybeSingle();
            return {
              ...c,
              article_headline: article?.headline ?? c.article_id,
              article_slug: article?.slug ?? '',
            };
          } catch {
            return { ...c, article_headline: c.article_id, article_slug: '' };
          }
        })
      );
      setComments(enriched);
    } catch (err) {
      toast.error('Failed to load comments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const approve = async (id: string) => {
    if (!supabase) return;
    setActionLoading(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase.from('comments').update({ approved: true }).eq('id', id);
      if (error) throw error;
      setComments(prev => prev.map(c => c.id === id ? { ...c, approved: true } : c));
      toast.success('Comment approved');
    } catch {
      toast.error('Failed to approve comment');
    } finally {
      setActionLoading(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const unapprove = async (id: string) => {
    if (!supabase) return;
    setActionLoading(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase.from('comments').update({ approved: false }).eq('id', id);
      if (error) throw error;
      setComments(prev => prev.map(c => c.id === id ? { ...c, approved: false } : c));
      toast.success('Comment unapproved');
    } catch {
      toast.error('Failed to unapprove comment');
    } finally {
      setActionLoading(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    setActionLoading(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== id));
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    } finally {
      setActionLoading(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const filtered = comments.filter(c => {
    const matchesTab =
      filter === 'all' ? true :
      filter === 'pending' ? !c.approved :
      c.approved;
    const q = query.toLowerCase();
    const matchesQuery = !q || (
      c.display_name.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q) ||
      (c.article_headline ?? '').toLowerCase().includes(q)
    );
    return matchesTab && matchesQuery;
  });

  const pendingCount = comments.filter(c => !c.approved).length;
  const approvedCount = comments.filter(c => c.approved).length;

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'pending',  label: 'Pending',  count: pendingCount },
    { id: 'approved', label: 'Approved', count: approvedCount },
    { id: 'all',      label: 'All',      count: comments.length },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comments</h1>
          <p className="text-sm text-slate-500 mt-1">
            {pendingCount > 0
              ? `${pendingCount} comment${pendingCount !== 1 ? 's' : ''} awaiting approval`
              : 'All comments reviewed'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchComments} className="gap-2">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
                filter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-mono',
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search comments…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <MessageSquare className="h-8 w-8" />
          <p className="text-sm">{filter === 'pending' ? 'No comments awaiting approval' : 'No comments found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(comment => (
            <div
              key={comment.id}
              className={cn(
                'rounded-xl border bg-white p-5 transition-all',
                !comment.approved ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
              )}
            >
              {/* Article link */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">On:</span>
                {comment.article_slug ? (
                  <a
                    href={`/article/${comment.article_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline font-medium truncate max-w-xs"
                  >
                    {comment.article_headline}
                  </a>
                ) : (
                  <span className="text-xs text-slate-500 truncate max-w-xs">{comment.article_headline}</span>
                )}
                {!comment.approved && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Pending
                  </span>
                )}
                {comment.approved && (
                  <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Approved
                  </span>
                )}
              </div>

              {/* Comment body */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                  {comment.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-slate-900">{comment.display_name}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                {!comment.approved ? (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    disabled={actionLoading.has(comment.id)}
                    onClick={() => approve(comment.id)}
                  >
                    <Check className="h-3.5 w-3.5" />Approve
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading.has(comment.id)}
                    onClick={() => unapprove(comment.id)}
                  >
                    Unapprove
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  disabled={actionLoading.has(comment.id)}
                  onClick={() => setDeleteTarget(comment)}
                >
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deleting a comment is permanent and there is no trash for comments, so
          it asks first. It used to fire on a single click, next to Unapprove —
          the two buttons sit side by side and the wrong one is easy to hit. */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              From {deleteTarget?.display_name || 'a reader'}. This is permanent — comments have no trash to
              restore from. To just take it off the site, use Unapprove instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <p className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 max-h-32 overflow-y-auto">
              {deleteTarget.content}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={e => {
                e.preventDefault();
                const target = deleteTarget;
                setDeleteTarget(null);
                if (target) remove(target.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
