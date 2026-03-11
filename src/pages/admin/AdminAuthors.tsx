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
import { Search, UserPlus, Edit, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAdminAuthorsList,
  saveAdminAuthor,
  createAdminAuthor,
  deleteAdminAuthor,
  type AdminAuthor,
} from '@/lib/adminDataService';
import { authors as jsonAuthors } from '@/data/seedData';
import { ImageUpload } from '@/components/admin/ImageUpload';

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

const emptyAuthor: Omit<AdminAuthor, 'id'> = {
  name: '',
  role: 'Student Journalist',
  bio: '',
  image: '',
  email: '',
  twitter: '',
};

export default function AdminAuthors() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminAuthor | null>(null);
  const [editingAuthor, setEditingAuthor] = useState<AdminAuthor | null>(null);
  const [formData, setFormData] = useState(emptyAuthor);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allAuthors = useMemo(mergeAuthors, [refreshKey]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allAuthors;
    const q = query.toLowerCase();
    return allAuthors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [allAuthors, query]);

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
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    const image =
      formData.image ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&size=200`;

    if (editingAuthor) {
      saveAdminAuthor({
        ...editingAuthor,
        ...formData,
        image,
        email: formData.email || undefined,
        twitter: formData.twitter || undefined,
      });
      toast.success('Author updated');
    } else {
      createAdminAuthor({
        ...formData,
        image,
        email: formData.email || undefined,
        twitter: formData.twitter || undefined,
      });
      toast.success('Author created');
    }
    setEditDialogOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAdminAuthor(deleteTarget.id);
    toast.success('Author deleted');
    setDeleteTarget(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Authors</h1>
          <p className="text-sm text-slate-500 mt-1">{allAuthors.length} authors</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Author
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search authors…"
          className="pl-9"
        />
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
                src={author.image || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDipdfJoNun68DCzbb0IGCbIZOjiBu7a7URg&s"}
                alt={author.name}
                className="w-12 h-12 rounded-full object-cover bg-slate-100 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDipdfJoNun68DCzbb0IGCbIZOjiBu7a7URg&s";
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{author.name}</h3>
                <p className="text-xs text-slate-500">{author.role}</p>
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
              {query ? 'No authors match your search.' : 'No authors yet.'}
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
              <p className="text-xs text-slate-400 mt-1">Leave blank for auto-generated avatar</p>
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
