/**
 * Admin User Service
 * Multi-user authentication and role-based access control for a newsroom.
 * Designed for 70+ staff with distinct editorial roles.
 *
 * Roles (highest → lowest privilege):
 *   super_admin       – full system access
 *   editor_in_chief   – full editorial + user management
 *   managing_editor   – full editorial access
 *   section_editor    – edit/approve within their assigned section
 *   reporter          – create & submit own articles
 *   photographer      – create articles, manage media
 */

export type UserRole =
  | 'super_admin'
  | 'editor_in_chief'
  | 'managing_editor'
  | 'section_editor'
  | 'reporter'
  | 'photographer';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  email: string;
  role: UserRole;
  section?: string;   // section editors: which section they own
  bio?: string;
  avatar?: string;
  phone?: string;
  graduationYear?: string;
  createdAt: string;
  lastLogin?: string;
  active: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:      'Super Admin',
  editor_in_chief:  'Editor-in-Chief',
  managing_editor:  'Managing Editor',
  section_editor:   'Section Editor',
  reporter:         'Reporter',
  photographer:     'Photographer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin:      'bg-red-100 text-red-700',
  editor_in_chief:  'bg-purple-100 text-purple-700',
  managing_editor:  'bg-blue-100 text-blue-700',
  section_editor:   'bg-indigo-100 text-indigo-700',
  reporter:         'bg-green-100 text-green-700',
  photographer:     'bg-amber-100 text-amber-700',
};

// Higher number = more privilege
const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin:      6,
  editor_in_chief:  5,
  managing_editor:  4,
  section_editor:   3,
  reporter:         2,
  photographer:     1,
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const USERS_KEY    = 'octagon_users_v2';
const SESSION_KEY  = 'octagon_session_v2';
export const ACTIVITY_KEY = 'octagon_activity_log';

// ─── Password hashing ─────────────────────────────────────────────────────────
// NOTE: For a production backend, replace with server-side bcrypt.
// This is a client-side fallback that's far better than plain text.
function simpleHash(password: string): string {
  return btoa(encodeURIComponent(password + '_octagon_salt_2025_secure_v2'));
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUsers(users: AdminUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
/** Creates a default super admin on first load if no users exist. */
export function ensureDefaultAdmin(): void {
  if (loadUsers().length === 0) {
    saveUsers([{
      id: 'user_default_admin',
      username: 'admin',
      passwordHash: simpleHash('octagon2025'),
      displayName: 'Administrator',
      email: 'admin@octagon.edu',
      role: 'super_admin',
      createdAt: new Date().toISOString(),
      active: true,
    }]);
  }
}

// ─── User CRUD ────────────────────────────────────────────────────────────────
export function getUsersList(): AdminUser[] {
  ensureDefaultAdmin();
  return loadUsers();
}

export function getUser(id: string): AdminUser | undefined {
  return loadUsers().find(u => u.id === id);
}

export function getUserByUsername(username: string): AdminUser | undefined {
  return loadUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

export function createUser(data: {
  username: string;
  password: string;
  displayName: string;
  email: string;
  role: UserRole;
  section?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  graduationYear?: string;
}): AdminUser {
  const { password, ...rest } = data;
  const user: AdminUser = {
    ...rest,
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
    active: true,
  };
  const users = loadUsers();
  users.push(user);
  saveUsers(users);
  logActivity('user_created', `New staff member "${user.displayName}" added as ${ROLE_LABELS[user.role]}`);
  return user;
}

export function updateUser(
  id: string,
  updates: Partial<Omit<AdminUser, 'id' | 'createdAt'>> & { password?: string }
): AdminUser | undefined {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return undefined;
  const { password, ...rest } = updates;
  users[idx] = {
    ...users[idx],
    ...rest,
    ...(password ? { passwordHash: simpleHash(password) } : {}),
  };
  saveUsers(users);
  return users[idx];
}

export function deleteUser(id: string): void {
  const user = getUser(id);
  if (user) logActivity('user_deleted', `Staff member "${user.displayName}" removed`);
  saveUsers(loadUsers().filter(u => u.id !== id));
}

// ─── Authentication ───────────────────────────────────────────────────────────
export function loginUser(username: string, password: string): AdminUser | null {
  ensureDefaultAdmin();
  const user = loadUsers().find(
    u => u.username.toLowerCase() === username.toLowerCase() &&
         u.passwordHash === simpleHash(password) &&
         u.active
  );
  if (!user) return null;
  updateUser(user.id, { lastLogin: new Date().toISOString() });
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: user.id,
    expiry: Date.now() + 8 * 60 * 60 * 1000, // 8-hour sessions
  }));
  logActivity('login', `${user.displayName} signed in`, user.id);
  return user;
}

export function logoutUser(): void {
  const session = getCurrentUser();
  if (session) logActivity('logout', `${session.displayName} signed out`, session.id);
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId, expiry } = JSON.parse(raw);
    if (expiry < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return getUser(userId) ?? null;
  } catch { return null; }
}

// ─── Permissions ──────────────────────────────────────────────────────────────
export type Permission =
  | 'manage_users'
  | 'manage_settings'
  | 'view_activity'
  | 'publish'
  | 'approve'
  | 'delete_any'
  | 'edit_any'
  | 'create';

export function canDo(user: AdminUser, action: Permission): boolean {
  const level = ROLE_LEVEL[user.role];
  switch (action) {
    case 'manage_users':    return level >= 5;
    case 'manage_settings': return level >= 5;
    case 'view_activity':   return level >= 4;
    case 'publish':         return level >= 3;
    case 'approve':         return level >= 3;
    case 'delete_any':      return level >= 4;
    case 'edit_any':        return level >= 3;
    case 'create':          return level >= 1;
    default:                return false;
  }
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVEL[role];
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  userId?: string;
  userDisplayName?: string;
  targetId?: string;
  timestamp: string;
}

export function logActivity(
  action: string,
  description: string,
  userId?: string,
  targetId?: string
): void {
  try {
    const user = userId ? getUser(userId) : undefined;
    const logs: ActivityLogEntry[] = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
    logs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      action,
      description,
      userId,
      userDisplayName: user?.displayName,
      targetId,
      timestamp: new Date().toISOString(),
    });
    // Keep last 1000 log entries
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(logs.slice(0, 1000)));
  } catch { /* non-fatal */ }
}

export function getActivityLog(): ActivityLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
  } catch { return []; }
}

export function clearActivityLog(): void {
  localStorage.removeItem(ACTIVITY_KEY);
}
