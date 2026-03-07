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

  const handleRestore = () => {
    if (!restoreTarget) return;
    const restored = restoreTrashedArticle(restoreTarget.article.id);
    if (restored) {
      toast.success(`"${restored.headline}" restored`);
      setRestoreTarget(null);
      refresh();
    } else {
      toast.error('Failed to restore article');
    }
  };

  const handlePermanentDelete = () => {
    if (!deleteTarget) return;
    permanentlyDeleteTrashedArticle(deleteTarget.article.id);
    toast.success('Article permanently deleted');
    setDeleteTarget(null);
    refresh();
  };

  const handleClearAll = () => {
    clearTrash();
    toast.success('Trash cleared');
    setClearOpen(false);
    refresh();
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
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Article</AlertDialogTitle>
            <AlertDialogDescription>
              Restore &ldquo;{restoreTarget?.article.headline}&rdquo;? It will be moved back to your stories list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure? This will permanently delete &ldquo;{deleteTarget?.article.headline}&rdquo;.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete}
              className="bg-red-600 hover:bg-red-700">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Trash</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {trash.length} articles in trash. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700">
              Clear All Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
