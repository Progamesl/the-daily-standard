import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, PenSquare, Trash2, Copy, Eye, Edit, MoreVertical,
  CheckSquare, Square, Flame, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminArticlesList, deleteAdminArticle, duplicateAdminArticle,
  importJsonArticle, getDeletedArticleIds, type AdminArticle,
  WORKFLOW_LABELS, WORKFLOW_COLORS, PRIORITY_COLORS,
} from '@/lib/adminDataService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useDataSync } from '@/contexts/DataSyncContext';
import { articles as jsonArticles } from '@/data/seedData';
import { cn } from '@/lib/utils';

const SECTION_NAMES: Record<string, string> = {
  us: 'News', arts: 'Arts', opinion: 'Opinion',
  editorial: 'Editorial', sports: 'Sports',
};

const ALL_STATUSES = [
  'pitch', 'assigned', 'draft', 'submitted',
  'in_review', 'approved', 'published', 'archived',
] as const;

function mergeAll(): AdminArticle[] {
  const map = new Map<string, AdminArticle>();
  const deletedIds = new Set(getDeletedArticleIds().map(String));
  
  // Add seed articles (excluding deleted ones)
  jsonArticles.forEach((a) => {
    if (!deletedIds.has(String(a.id))) {
    map.set(String(a.id), {
        id: String(a.id), slug: a.slug, headline: a.headline, dek: a.dek,
        body: a.body, image: a.image, images: a.images ?? [],
        imageCaption: a.imageCaption, section: a.section, author: { ...a.author },
        publishedAt: a.publishedAt.toISOString(), updatedAt: a.updatedAt?.toISOString(),
        readingTime: a.readingTime, tags: a.tags, status: 'published', priority: 'normal',
    });
    }
  });
  
  // Add admin articles (excluding deleted ones)
  getAdminArticlesList().forEach((a) => {
    if (!deletedIds.has(a.id)) {
      map.set(a.id, a);
    }
  });
  
  return Array.from(map.values());
}

export default function AdminStories() {
  const { currentUser } = useAdminAuth();
  // Subscribe to Supabase sync - re-renders when fresh data arrives
  const { syncVersion } = useDataSync();
  const [searchParams]      = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery]           = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter]   = useState(searchParams.get('status') ?? 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy]               = useState<'date' | 'title' | 'deadline'>('date');
  const [deleteTarget, setDeleteTarget]   = useState<AdminArticle | null>(null);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const navigate = useNavigate();

  // Re-render when Supabase sync completes (syncVersion changes)
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [syncVersion]);

  // Debounce search query for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allArticles = useMemo(mergeAll, [refreshKey]);

  const filtered = useMemo(() => {
    let list = [...allArticles];
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter(a =>
          a.headline.toLowerCase().includes(q) ||
          a.dek?.toLowerCase().includes(q) ||
        a.author.name.toLowerCase().includes(q) ||
        a.assignedToName?.toLowerCase().includes(q)
      );
    }
    if (sectionFilter  !== 'all') list = list.filter(a => a.section === sectionFilter);
    if (statusFilter   !== 'all') list = list.filter(a => a.status  === statusFilter);
    if (priorityFilter !== 'all') list = list.filter(a => (a.priority ?? 'normal') === priorityFilter);

    if (sortBy === 'date')     list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    else if (sortBy === 'title')    list.sort((a, b) => a.headline.localeCompare(b.headline));
    else if (sortBy === 'deadline') list.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    return list;
  }, [allArticles, debouncedQuery, sectionFilter, statusFilter, priorityFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const allSelected  = paginatedArticles.length > 0 && paginatedArticles.every(a => selected.has(a.id));
  const someSelected = paginatedArticles.some(a => selected.has(a.id));
  const selectedList = filtered.filter(a => selected.has(a.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedArticles.forEach(a => next.delete(a.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        paginatedArticles.forEach(a => next.add(a.id));
        return next;
      });
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const refresh = () => { setRefreshKey(k => k + 1); setSelected(new Set()); };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAdminArticle(
      deleteTarget.id,
      currentUser?.id,
      currentUser?.displayName,
      'Deleted from stories list'
    );
    toast.success('Story moved to trash');
    setDeleteTarget(null);
    refresh();
  };

  const handleBulkDelete = () => {
    selectedList.forEach(a => deleteAdminArticle(
      a.id,
      currentUser?.id,
      currentUser?.displayName,
      'Bulk deleted from stories list'
    ));
    toast.success(`${selectedList.length} stories moved to trash`);
    setBulkDeleteOpen(false);
    refresh();
  };

  const handleDuplicate = (article: AdminArticle) => {
    if (!article.id.startsWith('admin_')) importJsonArticle(article as unknown as Record<string, unknown>);
    if (duplicateAdminArticle(article.id)) {
      toast.success('Story duplicated');
      refresh();
    }
  };

  const handleEdit = (article: AdminArticle) => {
    if (!article.id.startsWith('admin_')) importJsonArticle(article as unknown as Record<string, unknown>);
    navigate(`/admin/stories/edit/${article.id}`);
  };

  const isOverdue = (a: AdminArticle) =>
    !!a.deadline && new Date(a.deadline) < new Date() && !['published', 'archived'].includes(a.status);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stories</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} of {allArticles.length} stories
            {someSelected && ` · ${selectedList.length} selected`}
          </p>
        </div>
        <Link to="/admin/stories/new">
          <Button className="gap-2"><PenSquare className="h-4 w-4" />New Story</Button>
        </Link>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-slate-900 text-white rounded-xl">
          <span className="text-sm font-medium mr-2">{selectedList.length} selected</span>
          <Button size="sm" variant="outline"
            className="text-white border-white/30 hover:bg-white/10 hover:text-white gap-1.5"
            onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete Selected
          </Button>
          <Button size="sm" variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10 ml-auto"
            onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, reporter…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{WORKFLOW_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {Object.entries(SECTION_NAMES).map(([slug, name]) => (
              <SelectItem key={slug} value={slug}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="breaking">🔴 Breaking</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Newest First</SelectItem>
            <SelectItem value="title">Title A–Z</SelectItem>
            <SelectItem value="deadline">By Deadline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase tracking-wider items-center">
          <div className="col-span-1 flex items-center">
            <button onClick={toggleAll} className="text-slate-400 hover:text-slate-700">
              {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
          </div>
          <div className="col-span-4">Title</div>
          <div className="col-span-2">Section</div>
          <div className="col-span-2">Reporter</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Deadline</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {paginatedArticles.map((article) => (
            <div key={article.id}
              className={cn(
                'grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors items-center',
                selected.has(article.id) && 'bg-blue-50 hover:bg-blue-50',
                isOverdue(article) && 'border-l-2 border-red-400'
              )}>
              {/* Checkbox */}
              <div className="md:col-span-1 hidden md:flex items-center">
                <Checkbox
                  checked={selected.has(article.id)}
                  onCheckedChange={() => toggleSelect(article.id)}
                />
              </div>

              {/* Title */}
              <div className="md:col-span-4 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {article.priority === 'breaking' && <Flame className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                  {article.priority === 'high'     && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                </div>
                <button onClick={() => handleEdit(article)}
                  className={cn('text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors truncate block text-left w-full',
                    PRIORITY_COLORS[article.priority ?? 'normal'])}>
                  {article.headline}
                </button>
                <p className="text-xs text-slate-400 truncate mt-0.5">{article.dek}</p>
              </div>

              {/* Section */}
              <div className="md:col-span-2">
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {SECTION_NAMES[article.section] ?? article.section}
                </span>
              </div>

              {/* Reporter */}
              <div className="md:col-span-2 text-xs text-slate-600 truncate">
                {article.assignedToName ?? article.author.name}
              </div>

              {/* Status */}
              <div className="md:col-span-1">
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                  WORKFLOW_COLORS[article.status]
                )}>
                  {WORKFLOW_LABELS[article.status]}
                </span>
              </div>

              {/* Deadline */}
              <div className="md:col-span-1 text-xs">
                {article.deadline ? (
                  <span className={cn(isOverdue(article) ? 'text-red-500 font-medium' : 'text-slate-400')}>
                    {new Date(article.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </div>

              {/* Actions */}
              <div className="md:col-span-1 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(article)}>
                      <Edit className="h-4 w-4 mr-2" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/article/${article.slug}`} target="_blank">
                        <Eye className="h-4 w-4 mr-2" />View on Site
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(article)}>
                      <Copy className="h-4 w-4 mr-2" />Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteTarget(article)}
                      className="text-red-600 focus:text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-400">
                {query || sectionFilter !== 'all' || statusFilter !== 'all'
                  ? 'No stories match your filters.'
                  : 'No stories yet. Create your first one!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} stories
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Single */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.headline}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedList.length} Stories</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedList.length} selected stories. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete {selectedList.length} Stories
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
