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

// ─── The retired localStorage user store ──────────────────────────────────────
//
// Everything that used to sit here — a second user table, password hashing,
// device fingerprints, verification codes, a mock email sender, login-attempt
// and blocked-IP lists, security alerts — belonged to a sign-in system that
// Supabase Auth replaced. Nothing outside this file has imported any of it for
// a long time: the only exports anyone still uses are the roles above, the
// permission check, and the activity log below.
//
// It is deleted rather than left in place. It is what made the Security page
// read four lists that nothing ever wrote to, and it kept four actions in the
// activity-log catalogue that could never actually happen.

// ─── Retired sign-in code ─────────────────────────────────────────────────────
//
// initiateLogin / verifyCode / loginUser / logoutUser / getCurrentUser used to
// live here: a second, weaker sign-in path over localStorage, with a pretend
// email-verification step. Nothing has called any of it since sign-in moved to
// Supabase Auth (src/lib/auth.ts), and it had rotted to the point of calling a
// function that no longer exists.
//
// It is gone rather than left lying about. A spare authentication system in an
// auth file is the kind of thing somebody wires back up by accident, and this
// one also fed the Security page its (empty, unwritable) lists of alerts,
// blocked addresses and locked accounts.

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

/**
 * Permission check. Accepts anything carrying a role — the Supabase-backed
 * session user (AdminSessionUser) as well as the legacy AdminUser record.
 */
export function canDo(user: { role: UserRole }, action: Permission): boolean {
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

/** This browser's offline copy of the log. The real one is on the server. */
export const ACTIVITY_KEY = 'octagon_activity_log';

export interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  userId?: string;
  userDisplayName?: string;
  targetId?: string;
  timestamp: string;
}

/**
 * Everything the newsroom can do, and what to call it in the log.
 *
 * One place, so the pages that write entries and the page that reads them
 * cannot drift apart — and so it is obvious at a glance what is *not* covered.
 * A log is only worth trusting if it is complete.
 */
export const ACTIVITY_ACTIONS = {
  // Stories
  article_created:     { area: 'Stories',  label: 'Story started' },
  article_saved:       { area: 'Stories',  label: 'Story edited' },
  article_published:   { area: 'Stories',  label: 'Published' },
  article_unpublished: { area: 'Stories',  label: 'Taken off the site' },
  article_trashed:     { area: 'Stories',  label: 'Moved to trash' },
  article_restored:    { area: 'Stories',  label: 'Restored' },
  article_purged:      { area: 'Stories',  label: 'Deleted for good' },
  article_duplicated:  { area: 'Stories',  label: 'Duplicated' },
  article_imported:    { area: 'Stories',  label: 'Imported' },
  revision_restored:   { area: 'Stories',  label: 'Revision restored' },
  note_added:          { area: 'Stories',  label: 'Note added' },
  note_deleted:        { area: 'Stories',  label: 'Note deleted' },

  // People on the masthead
  staff_added:         { area: 'Staff',    label: 'Person added' },
  staff_updated:       { area: 'Staff',    label: 'Person edited' },
  staff_removed:       { area: 'Staff',    label: 'Person removed' },

  // Logins
  account_created:     { area: 'Accounts', label: 'Account created' },
  account_updated:     { area: 'Accounts', label: 'Account changed' },
  account_removed:     { area: 'Accounts', label: 'Account deleted' },
  account_password:    { area: 'Accounts', label: 'Password changed' },
  login:               { area: 'Accounts', label: 'Signed in' },
  login_failed:        { area: 'Accounts', label: 'Sign-in refused' },
  logout:              { area: 'Accounts', label: 'Signed out' },

  // Readers
  comment_approved:    { area: 'Comments', label: 'Comment approved' },
  comment_unapproved:  { area: 'Comments', label: 'Comment hidden' },
  comment_deleted:     { area: 'Comments', label: 'Comment deleted' },

  // Advertising
  ad_created:          { area: 'Ads',      label: 'Ad created' },
  ad_updated:          { area: 'Ads',      label: 'Ad edited' },
  ad_deleted:          { area: 'Ads',      label: 'Ad deleted' },
  ad_activated:        { area: 'Ads',      label: 'Ad switched on' },
  ad_deactivated:      { area: 'Ads',      label: 'Ad switched off' },

  // The site itself
  settings_changed:    { area: 'Settings', label: 'Settings changed' },
  data_exported:       { area: 'Settings', label: 'Backup downloaded' },
  pdf_imported:        { area: 'Stories',  label: 'Story from a PDF' },
} as const;

export type ActivityAction = keyof typeof ACTIVITY_ACTIONS;

/** The groups the Activity Log offers as a filter, in order. */
export const ACTIVITY_AREAS = ['Stories', 'Staff', 'Accounts', 'Comments', 'Ads', 'Settings'] as const;

export const activityLabel = (action: string): string =>
  ACTIVITY_ACTIONS[action as ActivityAction]?.label ?? action;

export const activityArea = (action: string): string =>
  ACTIVITY_ACTIONS[action as ActivityAction]?.area ?? 'Other';

/**
 * Record something that happened, for the whole newsroom to see.
 *
 * This wrote to localStorage only, so the activity trail was a different trail
 * on every computer: an editor looking at the log saw what they themselves had
 * done and nothing else. There has been an activity_log table on the server the
 * whole time, unused. It writes there now, and keeps a local copy as an offline
 * fallback so nothing is lost when the connection drops.
 *
 * Deliberately not awaited — an editor's save must not wait on, or fail
 * because of, a log line.
 */
export function logActivity(
  action: string,
  description: string,
  userId?: string,
  targetId?: string,
  userDisplayName?: string,
): void {
  const entry: ActivityLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    action,
    description,
    userId,
    userDisplayName,
    targetId,
    timestamp: new Date().toISOString(),
  };

  try {
    const logs: ActivityLogEntry[] = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
    logs.unshift(entry);
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(logs.slice(0, 200)));
  } catch { /* non-fatal */ }

  void (async () => {
    try {
      const { supabase } = await import('./supabaseClient');
      if (!supabase) return;
      await supabase.from('activity_log').insert({
        id: entry.id,
        action: entry.action,
        description: entry.description,
        user_id: entry.userId ?? null,
        user_display_name: entry.userDisplayName ?? null,
        target_id: entry.targetId ?? null,
        timestamp: entry.timestamp,
      } as never);
    } catch {
      // Offline, or the row was rejected. The local copy above still has it.
    }
  })();
}

/** The whole newsroom's activity, newest first. Falls back to this browser's copy. */
export async function fetchActivityLog(limit = 200): Promise<ActivityLogEntry[]> {
  try {
    const { supabase } = await import('./supabaseClient');
    if (supabase) {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (!error && data) {
        return (data as unknown as Record<string, unknown>[]).map(r => ({
          id: String(r.id),
          action: String(r.action ?? ''),
          description: String(r.description ?? ''),
          userId: (r.user_id as string) ?? undefined,
          userDisplayName: (r.user_display_name as string) ?? undefined,
          targetId: (r.target_id as string) ?? undefined,
          timestamp: String(r.timestamp ?? new Date().toISOString()),
        }));
      }
    }
  } catch { /* fall through to the local copy */ }
  return getActivityLog();
}

/** This browser's copy only. Prefer fetchActivityLog. */
export function getActivityLog(): ActivityLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
  } catch { return []; }
}

/**
 * Drop this browser's offline copy of the log.
 *
 * There is no way to erase the shared log, deliberately: the database grants
 * staff SELECT and INSERT on activity_log and nothing else, so a delete would
 * quietly affect no rows. A record of who published and who deleted what is
 * worth more when nobody can rewrite it.
 */
export function clearLocalActivityLog(): void {
  localStorage.removeItem(ACTIVITY_KEY);
}

// ─── Security helpers, removed ────────────────────────────────────────────────
//
// getSecurityAlerts / resolveSecurityAlert / getLoginAttemptsHistory /
// getBlockedIPsList / unblockIP / unlockUser all read the localStorage stores
// deleted above. The Security page now reads the login_attempts table that real
// sign-ins actually write to, and turns accounts off through the auth layer.
