import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, RotateCcw, Trash2, Clock, User, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getTrashedArticles, restoreTrashedArticle, permanentlyDeleteTrashedArticle,
  clearTrash, type TrashedArticle,
} from '@/lib/adminDataService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { cn } from '@/lib/utils';

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  // If date is in the future (negative diff), show formatted date
  if (diff < 0) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins  = Math.floor(diff / 60000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminTrash() {
  const { currentUser } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery]           = useState('');
  const [restoreTarget, setRestoreTarget] = useState<TrashedArticle | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<TrashedArticle | null>(null);
  const [clearOpen, setClearOpen]        = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const trash = useMemo(() => getTrashedArticles(), [refreshKey]);

  const filtered = useMemo(() => {
    if (!query.trim()) return trash;
    const q = query.toLowerCase();
    return trash.filter(t =>
      t.article.headline.toLowerCase().includes(q) ||
      t.article.dek?.toLowerCase().includes(q) ||
      t.article.author.name.toLowerCase().includes(q) ||
      t.deletedByName.toLowerCase().includes(q)
    );
  }, [trash, query]);

  const refresh = () => setRefreshKey(k => k + 1);

  const [busy, setBusy] = useState(false);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setBusy(true);
    try {
      const restored = await restoreTrashedArticle(
        restoreTarget.article.id, currentUser?.id, currentUser?.displayName,
      );
      if (!restored) throw new Error('That story is no longer in the trash.');
      toast.success(`"${restored.headline}" is back in Stories, as a draft.`);
      setRestoreTarget(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not restore the story.');
    } finally {
      setBusy(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await permanentlyDeleteTrashedArticle(deleteTarget.article.id);
      toast.success('Story deleted for good');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the story.');
    } finally {
      setBusy(false);
    }
  };

  // Empties the trash for everyone, one story at a time, reporting what failed
  // rather than claiming success for the whole lot.
  const handleClearAll = async () => {
    setBusy(true);
    const failed: string[] = [];
    for (const t of trash) {
      try {
        await permanentlyDeleteTrashedArticle(t.article.id);
      } catch {
        failed.push(t.article.headline);
      }
    }
    clearTrash();
    setBusy(false);
    setClearOpen(false);
    refresh();
    const done = trash.length - failed.length;
    if (done) toast.success(`${done} ${done === 1 ? 'story' : 'stories'} deleted for good`);
    if (failed.length) toast.error(`Could not delete ${failed.length}: ${failed.slice(0, 3).join(', ')}`);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trash</h1>
          <p className="text-sm text-slate-500 mt-1">
            {trash.length} deleted article{trash.length !== 1 ? 's' : ''}
            {trash.length > 0 && ' · Restore or permanently delete'}
          </p>
        </div>
        {trash.length > 0 && (
          <Button variant="outline" onClick={() => setClearOpen(true)}
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />Clear All
          </Button>
        )}
      </div>

      {/* Search */}
      {trash.length > 0 && (
        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deleted articles…" className="pl-9" />
        </div>
      )}

      {/* Empty State */}
      {trash.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Trash is empty</h2>
          <p className="text-sm text-slate-500 max-w-md">
            Deleted articles will appear here. You can restore them or permanently delete them.
          </p>
        </div>
      )}

      {/* Trash List */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((trashed) => (
            <div key={trashed.article.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 mb-1 line-clamp-2">
                    {trashed.article.headline}
                  </h3>
                  {trashed.article.dek && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">{trashed.article.dek}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>Deleted by {trashed.deletedByName}</span>
                    </div>
                    <span>·</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{timeAgo(trashed.deletedAt)}</span>
                    </div>
                    {trashed.reason && (
                      <>
                        <span>·</span>
                        <span className="italic">{trashed.reason}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setRestoreTarget(trashed)}
                    className="gap-1.5">
                    <RotateCcw className="h-4 w-4" />Restore
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteTarget(trashed)}
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />Delete Forever
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && trash.length > 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-sm text-slate-400">No deleted articles match your search.</p>
        </div>
      )}

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreTarget} onOpenChange={o => { if (!o && !busy) setRestoreTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Put this story back?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{restoreTarget?.article.headline}&rdquo; returns to Stories as a draft. It does not go back
              on the public site until somebody publishes it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); handleRestore(); }}>
              {busy ? 'Restoring…' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o && !busy) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this story for good?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.article.headline}&rdquo; and everything in it — the text, the pictures it
              points at, its history — will be gone. There is nothing after this and no way to get it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={e => { e.preventDefault(); handlePermanentDelete(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              {busy ? 'Deleting…' : 'Delete forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={o => { if (!busy) setClearOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the trash?</AlertDialogTitle>
            <AlertDialogDescription>
              All {trash.length} {trash.length === 1 ? 'story' : 'stories'} in here will be gone for good, for
              everyone — not just on this computer. There is no way to get them back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={e => { e.preventDefault(); handleClearAll(); }}
              className="bg-red-600 hover:bg-red-700"
            >
              {busy ? 'Emptying…' : `Delete all ${trash.length} for good`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
