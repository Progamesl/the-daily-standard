import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  LayoutDashboard, FileText, Users, LogOut, ExternalLink,
  ChevronLeft, ChevronRight, Newspaper, Settings, Activity,
  UserCog, Trash2, BookOpen, BarChart3, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { ROLE_LABELS, ROLE_COLORS, canDo } from '@/lib/adminUserService';

const NAV_ITEMS = [
  { label: 'Dashboard',  path: '/admin',          icon: LayoutDashboard, exact: true,  permission: null },
  { label: 'Stories',    path: '/admin/stories',   icon: FileText,        exact: false, permission: null },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3,       exact: true,  permission: null },
  { label: 'PDF Import', path: '/admin/pdf-import', icon: BookOpen,        exact: true,  permission: null },
  { label: 'Security',   path: '/admin/security',   icon: Shield,          exact: true,  permission: 'super_admin_only' as const },
  { label: 'Authors',    path: '/admin/authors',   icon: Users,           exact: true,  permission: null },
  { label: 'Trash',      path: '/admin/trash',     icon: Trash2,          exact: true,  permission: null },
  { label: 'Staff',      path: '/admin/users',     icon: UserCog,         exact: true,  permission: 'manage_users' as const },
  { label: 'Activity',   path: '/admin/activity',  icon: Activity,        exact: true,  permission: 'view_activity' as const },
  { label: 'Settings',   path: '/admin/settings',  icon: Settings,        exact: true,  permission: 'manage_settings' as const },
];

export default function AdminLayout() {
  const { isAuthenticated, currentUser, logout } = useAdminAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const isActive = (path: string, exact: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const initials = currentUser?.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.permission === 'super_admin_only') {
      return currentUser?.role === 'super_admin';
    }
    return !item.permission || (currentUser && canDo(currentUser, item.permission));
  });

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
              <p className="text-sm font-bold text-white leading-tight truncate">The Daily Standard</p>
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
            {/* Logout button in user section */}
            <button
              onClick={() => {
                logout();
                window.location.href = '/admin/login';
              }}
              title="Sign Out"
              className={cn(
                'mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors w-full',
                collapsed && 'justify-center'
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
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
            onClick={() => {
              logout();
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
