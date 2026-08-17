import { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search, UserPlus, Edit, Trash2, Mail, Shield, Clock,
  UserCheck, UserX, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type UserRole,
  ROLE_LABELS, ROLE_COLORS, getRoleLevel, logActivity,
} from '@/lib/adminUserService';
import {
  listStaff, createStaff, updateStaff, resetStaffPassword, deleteStaff,
  type StaffMember,
} from '@/lib/staffService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { cn } from '@/lib/utils';

const SECTION_OPTIONS = [
  { slug: 'us',       name: 'News' },
  { slug: 'arts',     name: 'Arts' },
  { slug: 'opinion',  name: 'Opinion' },
  { slug: 'editorial',name: 'Editorial' },
  { slug: 'sports',   name: 'Sports' },
];

interface UserForm {
  username: string;
  password: string;
  displayName: string;
  email: string;
  role: UserRole;
  section: string;
  bio: string;
  phone: string;
  graduationYear: string;
}

const emptyForm: UserForm = {
  username: '', password: '', displayName: '', email: '',
  role: 'reporter', section: '', bio: '', phone: '', graduationYear: '',
};

function timeAgo(iso?: string): string {
  if (!iso) return 'Never';
  const diff  = Date.now() - new Date(iso).getTime();
  // If date is in the future (negative diff), show formatted date
  if (diff < 0) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminUsers() {
  const { currentUser, refreshUser } = useAdminAuth();
  const [query, setQuery]           = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [editingUser, setEditingUser]   = useState<StaffMember | null>(null);
  const [form, setForm]                 = useState<UserForm>(emptyForm);
  const [newPassword, setNewPassword]   = useState('');
  const [passwordTarget, setPasswordTarget] = useState<StaffMember | null>(null);
  const [errors, setErrors] = useState<Partial<UserForm>>({});

  // Staff now live in Supabase and are managed through /api/staff, so this is
  // loaded from the server rather than read synchronously from localStorage.
  const [allUsers, setAllUsers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setAllUsers(await listStaff());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load staff.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    let list = [...allUsers];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(u =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        ROLE_LABELS[u.role].toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    // Sort by role level desc, then name
    list.sort((a, b) => {
      const lvl = getRoleLevel(b.role) - getRoleLevel(a.role);
      return lvl !== 0 ? lvl : a.displayName.localeCompare(b.displayName);
    });
    return list;
  }, [allUsers, query, roleFilter]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (user: StaffMember) => {
    setEditingUser(user);
    setForm({
      username: user.username, password: '',
      displayName: user.displayName, email: user.email,
      role: user.role, section: user.section ?? '',
      bio: user.bio ?? '', phone: user.phone ?? '',
      graduationYear: user.graduationYear ?? '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<UserForm> = {};
    if (!form.displayName.trim()) errs.displayName = 'Name is required.';
    if (!form.username.trim())    errs.username = 'Username is required.';
    if (!form.email.trim())       errs.email = 'Email is required.';
    if (!editingUser && !form.password.trim()) errs.password = 'Password is required.';
    // The server enforces 10+; match it here so the error appears before saving.
    if (form.password && form.password.length < 10) errs.password = 'Password must be at least 10 characters.';
    // Check duplicate username
    const existing = allUsers.find(u => u.username.toLowerCase() === form.username.toLowerCase() && u.id !== editingUser?.id);
    if (existing) errs.username = 'Username already taken.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.displayName)}&size=200&background=random`;
      if (editingUser) {
        await updateStaff(editingUser.id, {
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          role: form.role,
          section: form.section || undefined,
          bio: form.bio || undefined,
          phone: form.phone || undefined,
          graduationYear: form.graduationYear || undefined,
        });
        if (form.password) await resetStaffPassword(editingUser.id, form.password);
        if (editingUser.id === currentUser?.id) refreshUser();
        const changedRole = editingUser.role !== form.role;
        logActivity(
          'account_updated',
          `Changed ${form.displayName.trim()}'s account${changedRole ? ` — role is now ${ROLE_LABELS[form.role]}` : ''}${form.password ? ', and set a new password' : ''}`,
          currentUser?.id, editingUser.id, currentUser?.displayName,
        );
        toast.success('Staff member updated');
      } else {
        await createStaff({
          username: form.username.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          role: form.role,
          section: form.section || undefined,
          bio: form.bio || undefined,
          phone: form.phone || undefined,
          graduationYear: form.graduationYear || undefined,
          avatar,
        });
        logActivity(
          'account_created',
          `Created a ${ROLE_LABELS[form.role]} account for ${form.displayName.trim()} (${form.email.trim()})`,
          currentUser?.id, undefined, currentUser?.displayName,
        );
        toast.success(`${form.displayName} can now sign in with their email and password`);
      }
      setDialogOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save this staff member.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: StaffMember) => {
    if (user.id === currentUser?.id) { toast.error("You can't deactivate yourself."); return; }
    try {
      await updateStaff(user.id, { active: !user.active });
      logActivity(
        'account_updated',
        `${user.active ? 'Turned off' : 'Turned on'} the account for ${user.displayName}`,
        currentUser?.id, user.id, currentUser?.displayName,
      );
      toast.success(user.active ? `${user.displayName} can no longer sign in` : `${user.displayName} reactivated`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update this account.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.id) { toast.error("You can't delete your own account."); return; }
    try {
      await deleteStaff(deleteTarget.id);
      logActivity(
        'account_removed',
        `Deleted the ${ROLE_LABELS[deleteTarget.role]} account for ${deleteTarget.displayName} (${deleteTarget.email})`,
        currentUser?.id, deleteTarget.id, currentUser?.displayName,
      );
      toast.success(`${deleteTarget.displayName} removed from staff`);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove this staff member.');
    }
  };

  const handleResetPassword = async () => {
    if (!passwordTarget || !newPassword.trim()) return;
    if (newPassword.length < 10) { toast.error('Password must be at least 10 characters.'); return; }
    try {
      await resetStaffPassword(passwordTarget.id, newPassword);
      // The password itself is never logged, only that it changed.
      logActivity(
        'account_password',
        `Set a new password for ${passwordTarget.displayName}`,
        currentUser?.id, passwordTarget.id, currentUser?.displayName,
      );
      toast.success(`New password set for ${passwordTarget.displayName}`);
      setPasswordDialogOpen(false);
      setNewPassword('');
      setPasswordTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset the password.');
    }
  };

  const canEditUser = (user: StaffMember) => {
    if (!currentUser) return false;
    if (currentUser.id === user.id) return true; // can edit self
    return getRoleLevel(currentUser.role) > getRoleLevel(user.role);
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const roleStats = useMemo(() => {
    const counts: Partial<Record<UserRole, number>> = {};
    allUsers.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
    return counts;
  }, [allUsers]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500 mt-1">{allUsers.length} staff members</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />Add Staff Member
        </Button>
      </div>

      {/* Role breakdown */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.entries(ROLE_LABELS) as [UserRole, string][])
          .filter(([role]) => roleStats[role])
          .map(([role, label]) => (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                roleFilter === role
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : cn('border-transparent', ROLE_COLORS[role])
              )}
            >
              {label}
              <span className="font-bold">{roleStats[role]}</span>
            </button>
          ))}
        {roleFilter !== 'all' && (
          <button onClick={() => setRoleFilter('all')}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 text-slate-500 hover:border-slate-400">
            Clear filter
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username, email, role…" className="pl-9" />
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Section</div>
          <div className="col-span-2">Last Active</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map(user => (
            <div key={user.id}
              className={cn(
                'grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-center',
                !user.active && 'opacity-50'
              )}>
              {/* Name */}
              <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  user.active ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
                )}>
                  {initials(user.displayName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user.displayName}</p>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" />{user.email}
                  </p>
                  {user.username && (
                    <p className="text-xs text-slate-400">@{user.username}</p>
                  )}
                </div>
              </div>

              {/* Role */}
              <div className="md:col-span-2">
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', ROLE_COLORS[user.role])}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>

              {/* Section */}
              <div className="md:col-span-2 text-xs text-slate-600">
                {user.section
                  ? SECTION_OPTIONS.find(s => s.slug === user.section)?.name ?? user.section
                  : <span className="text-slate-300">—</span>}
              </div>

              {/* Last Active */}
              <div className="md:col-span-2 text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {timeAgo(user.lastLogin)}
              </div>

              {/* Status */}
              <div className="md:col-span-1">
                {user.active
                  ? <span className="text-[10px] font-bold uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                  : <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>

              {/* Actions */}
              <div className="md:col-span-1 flex justify-end gap-1">
                {canEditUser(user) && (
                  <>
                    <button onClick={() => openEdit(user)} title="Edit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setPasswordTarget(user); setPasswordDialogOpen(true); }} title="Reset Password"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleToggleActive(user)}
                      title={user.active ? 'Deactivate' : 'Reactivate'}
                      className={cn('p-1.5 rounded-lg transition-colors',
                        user.active
                          ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                          : 'text-slate-400 hover:text-green-500 hover:bg-green-50'
                      )}>
                      {user.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </button>
                    {user.id !== currentUser?.id && (
                      <button onClick={() => setDeleteTarget(user)} title="Remove"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {/* Staff come from the server now, so the list has real loading and
              failure states — an empty table shouldn't look like "no staff"
              when it actually means "still loading" or "request failed". */}
          {loading && (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
              <p className="text-sm text-slate-400">Loading staff…</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-red-600">{loadError}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => void refresh()}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-400">
                {query || roleFilter !== 'all' ? 'No staff match your filters.' : 'No staff added yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? `Edit ${editingUser.displayName}` : 'Add Staff Member'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update this staff member\'s information and access level.' : 'Add a new staff member to the newsroom.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="u-name">Full Name *</Label>
                <Input id="u-name" value={form.displayName}
                  onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="Jane Smith" className={cn('mt-1', errors.displayName && 'border-red-400')} />
                {errors.displayName && <p className="text-xs text-red-500 mt-0.5">{errors.displayName}</p>}
              </div>
              <div>
                <Label htmlFor="u-username">Username *</Label>
                <Input id="u-username" value={form.username}
                  onChange={(e) => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                  placeholder="jsmith" className={cn('mt-1', errors.username && 'border-red-400')} />
                {errors.username && <p className="text-xs text-red-500 mt-0.5">{errors.username}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="jsmith@saccds.org" className={cn('mt-1', errors.email && 'border-red-400')} />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="u-password">
                {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
              </Label>
              <Input id="u-password" type="password" value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={editingUser ? 'Leave blank to keep current' : 'Min 8 characters'}
                className={cn('mt-1', errors.password && 'border-red-400')} />
              {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="u-role">Role *</Label>
                <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v as UserRole }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                      <SelectItem key={role} value={role}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="u-section">Section <span className="text-slate-400 text-xs">(for section editors)</span></Label>
                <Select value={form.section || '__any__'} onValueChange={(v) => setForm(p => ({ ...p, section: v === '__any__' ? '' : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any / All</SelectItem>
                    {SECTION_OPTIONS.map(s => (
                      <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="u-phone">Phone</Label>
                <Input id="u-phone" value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(916) 555-0100" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="u-grad">Graduation Year</Label>
                <Input id="u-grad" value={form.graduationYear}
                  onChange={(e) => setForm(p => ({ ...p, graduationYear: e.target.value }))}
                  placeholder="2026" className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="u-bio">Bio</Label>
              <Textarea id="u-bio" value={form.bio}
                onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Short biography…" className="mt-1" rows={2} />
            </div>

            {/* Role Permission Summary */}
            <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="h-3.5 w-3.5 text-slate-500" />
                <p className="text-xs font-semibold text-slate-600">Permissions for {ROLE_LABELS[form.role]}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {form.role === 'super_admin'     && 'Full access to everything including system settings and all staff management.'}
                {form.role === 'editor_in_chief' && 'Full editorial access, can manage staff, view activity logs, and configure settings.'}
                {form.role === 'managing_editor' && 'Full editorial access over all stories and authors. Can view activity logs.'}
                {form.role === 'section_editor'  && 'Can review, approve, and publish stories. Focused on their assigned section.'}
                {form.role === 'reporter'        && 'Can create, draft, and submit their own stories for editorial review.'}
                {form.role === 'photographer'    && 'Can create articles and manage media. Limited to own content.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : editingUser ? 'Update' : 'Add to Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {passwordTarget?.displayName}.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="new-pw">New Password</Label>
            <Input id="new-pw" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters" className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPasswordDialogOpen(false); setNewPassword(''); }}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={!newPassword.trim()}>Set Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.displayName} from the staff portal.
              Their articles will not be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
