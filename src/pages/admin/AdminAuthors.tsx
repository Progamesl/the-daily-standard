import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus, Edit, Trash2, Mail, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminAuthorsList,
  saveAdminAuthor,
  createAdminAuthor,
  deleteAdminAuthor,
  type AdminAuthor,
} from '@/lib/adminDataService';
import { MASTHEAD_SECTIONS, clearMastheadCache } from '@/lib/mastheadService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { authors as jsonAuthors } from '@/data/seedData';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { cn } from '@/lib/utils';

function mergeAuthors(): AdminAuthor[] {
  // First pass: deduplicate by ID (admin authors override seed authors)
  const byId = new Map<string, AdminAuthor>();
  jsonAuthors.forEach((a) =>
    byId.set(a.id, {
      id: a.id,
      name: a.name,
      role: a.role,
      bio: a.bio,
      image: a.image,
      email: a.email,
      twitter: a.twitter,
    })
  );
  getAdminAuthorsList().forEach((a) => byId.set(a.id, a));
  
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

interface AuthorForm {
  name: string;
  role: string;
  bio: string;
  image: string;
  email: string;
  twitter: string;
  onMasthead: boolean;
  primarySection: string;
  altSections: string[];
  sortOrder: number;
}

const emptyAuthor: AuthorForm = {
  name: '',
  role: 'Reporter',
  bio: '',
  image: '',
  email: '',
  twitter: '',
  onMasthead: false,
  primarySection: 'Reporters',
  altSections: [],
  sortOrder: 0,
};

export default function AdminAuthors() {
  const { currentUser } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminAuthor | null>(null);
  const [editingAuthor, setEditingAuthor] = useState<AdminAuthor | null>(null);
  const [formData, setFormData] = useState(emptyAuthor);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allAuthors = useMemo(mergeAuthors, [refreshKey]);

  const onMastheadCount = useMemo(
    () => allAuthors.filter((a) => a.onMasthead).length,
    [allAuthors],
  );

  // Default to this year's staff. Nobody opening this page wants to scroll
  // through a decade of alumni to fix a bio.
  const [scope, setScope] = useState<'masthead' | 'all'>('masthead');

  const filtered = useMemo(() => {
    let list = scope === 'masthead' && onMastheadCount > 0
      ? allAuthors.filter((a) => a.onMasthead)
      : allAuthors;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          (a.email && a.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allAuthors, query, scope, onMastheadCount]);

  const openCreate = () => {
    setEditingAuthor(null);
    setFormData(emptyAuthor);
    setEditDialogOpen(true);
  };

  const openEdit = (author: AdminAuthor) => {
    setEditingAuthor(author);
    setFormData({
      name: author.name,
      role: author.role,
      bio: author.bio,
      image: author.image,
      email: author.email ?? '',
      twitter: author.twitter ?? '',
      onMasthead: author.onMasthead ?? false,
      primarySection: author.primarySection || 'Reporters',
      altSections: author.altSections ?? [],
      sortOrder: author.sortOrder ?? 0,
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    const fields = {
      name: formData.name,
      role: formData.role,
      bio: formData.bio,
      // No photo means initials, which the staff page draws itself and which
      // look better than a generated avatar.
      image: formData.image,
      email: formData.email || undefined,
      twitter: formData.twitter || undefined,
      onMasthead: formData.onMasthead,
      primarySection: formData.onMasthead ? formData.primarySection : undefined,
      altSections: formData.onMasthead ? formData.altSections : [],
      tags: editingAuthor?.tags ?? [],
      sortOrder: formData.sortOrder,
    };

    if (editingAuthor) {
      saveAdminAuthor({ ...editingAuthor, ...fields }, currentUser?.id, currentUser?.displayName);
      toast.success(formData.onMasthead ? 'Saved — they are on the staff page' : 'Saved');
    } else {
      createAdminAuthor(fields, currentUser?.id, currentUser?.displayName);
      toast.success(formData.onMasthead ? 'Added to the staff page' : 'Person added');
    }

    // The staff page keeps a short cache; drop it so the change is visible now.
    clearMastheadCache();
    setEditDialogOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAdminAuthor(deleteTarget.id, currentUser?.id, currentUser?.displayName);
    clearMastheadCache();
    toast.success(`${deleteTarget.name} removed — the Activity Log can put them back`);
    setDeleteTarget(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500 mt-1">
            {onMastheadCount} on the public staff page · {allAuthors.length} people who have written for the paper
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Person
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role or email…"
            className="pl-9"
          />
        </div>
        {/* Sixty-odd authors going back years, and thirty-one on this year's
            masthead. Without this you scroll past a decade of alumni to find
            the person you want to edit. */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          {([['masthead', 'On the staff page'], ['all', 'Everyone']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                scope === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Authors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((author) => (
          <div
            key={author.id}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <img
                src={author.image || "/favicon.png"}
                alt={author.name}
                className="w-12 h-12 rounded-full object-cover bg-slate-100 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/favicon.png";
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                  {author.name}
                  {author.onMasthead && (
                    <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                  )}
                </h3>
                <p className="text-xs text-slate-500">{author.role}</p>
                {author.onMasthead && author.primarySection && (
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
                    {author.primarySection}
                  </p>
                )}
                {author.email && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {author.email}
                  </p>
                )}
              </div>
            </div>
            {author.bio && (
              <p className="text-xs text-slate-500 mt-3 line-clamp-2">{author.bio}</p>
            )}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => openEdit(author)} className="gap-1 text-xs h-7">
                <Edit className="h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(author)}
                className="gap-1 text-xs h-7 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-sm text-slate-400">
              {query
                ? 'Nobody matches your search.'
                : scope === 'masthead'
                  ? 'Nobody is on the staff page yet. Edit someone and turn on “Show on the staff page”.'
                  : 'No authors yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAuthor ? 'Edit Author' : 'Add New Author'}</DialogTitle>
            <DialogDescription>
              {editingAuthor ? 'Update author details.' : 'Add a new author to the team.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="author-name">Name *</Label>
              <Input
                id="author-name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="author-role">Role</Label>
              <Input
                id="author-role"
                value={formData.role}
                onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                placeholder="e.g. Reporter, Editor, etc."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="author-email">Email</Label>
              <Input
                id="author-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="author-bio">Bio</Label>
              <Textarea
                id="author-bio"
                value={formData.bio}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Short biography…"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <ImageUpload
                value={formData.image}
                onChange={(url) => setFormData((p) => ({ ...p, image: url }))}
                label="Author Photo"
              />
              <p className="text-xs text-slate-400 mt-1">Leave blank and their initials are used instead</p>
            </div>

            {/* ── The staff page ────────────────────────────────────────────
                Everyone who has ever written for the paper is an author, and
                there are dozens of them going back years. This is what decides
                which of them are on this year's masthead. */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label className="text-sm font-semibold text-slate-800">Show on the staff page</Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Puts them on the public masthead at /staff.
                  </p>
                </div>
                <Switch
                  checked={formData.onMasthead}
                  onCheckedChange={(v) => setFormData((p) => ({
                    ...p,
                    onMasthead: v,
                    primarySection: p.primarySection || 'Reporters',
                  }))}
                />
              </div>

              {formData.onMasthead && (
                <div className="space-y-4 pt-1">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1.5 block">Appears under</Label>
                    <Select
                      value={formData.primarySection || 'Reporters'}
                      onValueChange={(v) => setFormData((p) => ({ ...p, primarySection: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MASTHEAD_SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500 mb-1.5 block">
                      Also listed under
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {MASTHEAD_SECTIONS
                        .filter((s) => s !== (formData.primarySection || 'Reporters'))
                        .map((s) => {
                          const on = formData.altSections.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData((p) => ({
                                ...p,
                                altSections: on
                                  ? p.altSections.filter((x) => x !== s)
                                  : [...p.altSections, s],
                              }))}
                              className={cn(
                                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                                on
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                              )}
                            >
                              {s}
                            </button>
                          );
                        })}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      For people who do more than one job — a reporter who also takes photos.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="author-order" className="text-xs text-slate-500 mb-1.5 block">
                      Position in that section
                    </Label>
                    <Input
                      id="author-order"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                      className="w-28"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Lower numbers come first. Leave at 0 to sort by name.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingAuthor ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Author</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This won&apos;t delete their articles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
