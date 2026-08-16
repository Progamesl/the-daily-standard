import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  LayoutDashboard, FileText, Users, LogOut, ExternalLink,
  ChevronLeft, ChevronRight, Newspaper, Settings, Activity,
  UserCog, Trash2, BookOpen, BarChart3, Shield, MessageSquare, MonitorPlay, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { ROLE_LABELS, ROLE_COLORS, canDo, type UserRole } from '@/lib/adminUserService';

/**
 * The sidebar, and the single source of truth for who may open what.
 *
 * These permissions used to only hide links. The routes themselves were open,
 * so a reporter who typed /admin/users or /admin/settings — or followed a
 * bookmark from a former editor — walked straight into staff management. The
 * same list now guards the routes; see RequirePermission below.
 */
export const NAV_ITEMS = [
  { label: 'Dashboard',  path: '/admin',            icon: LayoutDashboard, exact: true,  permission: null },
  { label: 'Stories',    path: '/admin/stories',    icon: FileText,        exact: false, permission: null },
  { label: 'Comments',   path: '/admin/comments',   icon: MessageSquare,   exact: true,  permission: null },
  { label: 'Ads',        path: '/admin/ads',        icon: MonitorPlay,     exact: true,  permission: null },
  { label: 'Analytics',  path: '/admin/analytics',  icon: BarChart3,       exact: true,  permission: null },
  { label: 'PDF Import', path: '/admin/pdf-import', icon: BookOpen,        exact: true,  permission: null },
  { label: 'Security',   path: '/admin/security',   icon: Shield,          exact: true,  permission: 'super_admin_only' as const },
  // Called "Staff" and not "Authors" because that is what people come here to
  // edit. The page holds everyone who has ever had a byline, but the job it
  // exists for is the masthead at /staff.
  { label: 'Staff',      path: '/admin/authors',    icon: Users,           exact: true,  permission: null },
  { label: 'Trash',      path: '/admin/trash',      icon: Trash2,          exact: true,  permission: null },
  { label: 'Staff',      path: '/admin/users',      icon: UserCog,         exact: true,  permission: 'manage_users' as const },
  { label: 'Activity',   path: '/admin/activity',   icon: Activity,        exact: true,  permission: 'view_activity' as const },
  { label: 'Settings',   path: '/admin/settings',   icon: Settings,        exact: true,  permission: 'manage_settings' as const },
];

type NavPermission = (typeof NAV_ITEMS)[number]['permission'];

export function mayOpen(
  user: { role: UserRole } | null | undefined,
  permission: NavPermission,
): boolean {
  if (!permission) return true;
  if (!user) return false;
  if (permission === 'super_admin_only') return user.role === 'super_admin';
  return canDo(user, permission);
}

/**
 * Gate a route on the same permission that decides whether its link is shown.
 *
 * Someone who reaches a page they may not use is sent back to the dashboard
 * with an explanation rather than a blank screen — from the inside, a newsroom
 * permission is a job description, not a security wall, and it should read that
 * way.
 */
export function RequirePermission({ permission, children }: { permission: NavPermission; children: ReactNode }) {
  const { currentUser } = useAdminAuth();
  if (mayOpen(currentUser, permission)) return <>{children}</>;
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Lock className="h-5 w-5 text-slate-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">This part of the newsroom is not open to you</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account is a {currentUser ? ROLE_LABELS[currentUser.role] : 'signed-out user'}. Ask an
          Editor-in-Chief if you need access to this page.
        </p>
        <Link to="/admin" className="mt-5 inline-block">
          <Button variant="outline" size="sm">Back to the dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { isAuthenticated, loading, currentUser, logout } = useAdminAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Restoring a Supabase session is async. Without this gate, a signed-in
  // editor would be bounced to /admin/login on every page load.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
          <p className="text-sm text-slate-500">Loading your newsroom…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve where they were headed so login can return them there.
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?returnTo=${returnTo}`} replace />;
  }

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const initials = currentUser?.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  const visibleNavItems = NAV_ITEMS.filter(item => mayOpen(currentUser, item.permission));

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'relative flex flex-col bg-slate-900 text-white transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Masthead */}
        <div className={cn(
          'flex items-center gap-2.5 px-4 py-5 border-b border-white/10 shrink-0',
          collapsed && 'justify-center px-2'
        )}>
          <div className="flex items-center justify-center w-8 h-8 bg-white/10 rounded-lg shrink-0">
            <Newspaper className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">The Octagon</p>
              <p className="text-[10px] text-slate-400 truncate">Admin Portal</p>
            </div>
          )}
        </div>

        {/* Current User */}
        {currentUser && (
          <div className="px-4 py-3 border-b border-white/10 shrink-0">
            {!collapsed ? (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{currentUser.displayName}</p>
                  <span className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                    ROLE_COLORS[currentUser.role]
                  )}>
                    {ROLE_LABELS[currentUser.role]}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </div>
              </div>
            )}
            {/* Sign Out lives once, in the actions at the foot of the sidebar. */}
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-white/10 p-2 space-y-0.5 shrink-0">
          <Link
            to="/"
            target="_blank"
            title={collapsed ? 'View Live Site' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            <ExternalLink className="h-5 w-5 shrink-0" />
            {!collapsed && <span>View Live Site</span>}
          </Link>
          <button
            onClick={async () => {
              await logout();
              window.location.href = '/admin/login';
            }}
            title={collapsed ? 'Sign Out' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors w-full',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-100 text-white flex items-center justify-center hover:bg-slate-600 transition-colors shadow-sm z-10"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto">
        <Toaster position="top-right" />
        <Outlet />
      </main>
    </div>
  );
}
