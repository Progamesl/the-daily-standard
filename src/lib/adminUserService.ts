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
  lockedUntil?: string;  // ISO timestamp when account unlocks
  failedAttempts?: number; // Count of failed login attempts
  approvedBy?: string;     // Super admin who approved this account
  approvedAt?: string;     // When account was approved
  
  // Enhanced Security Fields
  emailVerified: boolean;           // Email verified via code
  twoFactorEnabled: boolean;        // 2FA enabled
  twoFactorSecret?: string;         // TOTP secret (if using authenticator app)
  trustedDevices?: TrustedDevice[];  // Trusted devices (fingerprint)
  securityQuestions?: SecurityQuestion[]; // Backup authentication
  passwordChangedAt?: string;       // Last password change
  passwordExpiresAt?: string;        // Password expiration (90 days)
  requiresPasswordChange?: boolean;  // Force password change on next login
}

export interface TrustedDevice {
  fingerprint: string;    // Device fingerprint hash
  name: string;          // User-friendly device name
  lastUsed: string;      // ISO timestamp
  ip?: string;           // Last known IP
  userAgent?: string;    // Browser/device info
}

export interface SecurityQuestion {
  question: string;
  answerHash: string;    // Hashed answer
}

export interface VerificationCode {
  code: string;
  type: 'email_verification' | '2fa' | 'password_reset' | 'device_verification';
  userId: string;
  expiresAt: string;     // ISO timestamp
  attempts: number;      // Failed attempts
  used: boolean;
}

export interface LoginAttempt {
  id: string;
  username: string;
  ip: string;
  userAgent: string;
  success: boolean;
  timestamp: string;
  userId?: string;
}

export interface SecurityAlert {
  id: string;
  type: 'brute_force' | 'suspicious_ip' | 'account_locked' | 'multiple_failures' | 'unusual_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
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
const USERS_KEY    = 'octagon_users_v3';  // v3 for enhanced security fields
const SESSION_KEY  = 'octagon_session_v3';
export const ACTIVITY_KEY = 'octagon_activity_log';
const LOGIN_ATTEMPTS_KEY = 'octagon_login_attempts_v2';
const BLOCKED_IPS_KEY = 'octagon_blocked_ips_v2';
const SECURITY_ALERTS_KEY = 'octagon_security_alerts_v2';
const VERIFICATION_CODES_KEY = 'octagon_verification_codes_v1';
const TRUSTED_DEVICES_KEY = 'octagon_trusted_devices_v1';

// ─── Security Configuration ───────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;           // Lock account after 5 failed attempts
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes lockout
const IP_BLOCK_DURATION = 60 * 60 * 1000; // 1 hour IP block
const MAX_ATTEMPTS_PER_IP = 10;          // Block IP after 10 total failed attempts
const SUSPICIOUS_ACTIVITY_THRESHOLD = 3; // Alert after 3 suspicious events
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours session
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes for codes
const PASSWORD_EXPIRY_DAYS = 90;        // Password expires after 90 days
const MIN_PASSWORD_LENGTH = 12;         // Minimum password length
const REQUIRE_PASSWORD_COMPLEXITY = true; // Require uppercase, lowercase, number, special char

// ─── Password hashing ─────────────────────────────────────────────────────────
// NOTE: For a production backend, replace with server-side bcrypt.
// This is a client-side fallback that's far better than plain text.
function simpleHash(password: string): string {
  return btoa(encodeURIComponent(password + '_octagon_salt_2025_secure_v3'));
}

// ─── Password Validation ──────────────────────────────────────────────────────
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  
  if (REQUIRE_PASSWORD_COMPLEXITY) {
    if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letters');
    if (!/[0-9]/.test(password)) errors.push('Password must contain numbers');
    if (!/[^a-zA-Z0-9]/.test(password)) errors.push('Password must contain special characters');
  }
  
  // Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'octagon', 'admin'];
  if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password is too common or weak');
  }
  
  return { valid: errors.length === 0, errors };
}

// ─── Device Fingerprinting ────────────────────────────────────────────────────
function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'unknown';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 2, 2);
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');
  return btoa(fingerprint).slice(0, 32);
}

function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}

// ─── Verification Code Management ────────────────────────────────────────────
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

function saveVerificationCode(code: VerificationCode): void {
  const codes: VerificationCode[] = JSON.parse(localStorage.getItem(VERIFICATION_CODES_KEY) || '[]');
  codes.push(code);
  // Keep only last 100 codes
  localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes.slice(-100)));
}

function getVerificationCode(userId: string, type: VerificationCode['type']): VerificationCode | null {
  const codes: VerificationCode[] = JSON.parse(localStorage.getItem(VERIFICATION_CODES_KEY) || '[]');
  const code = codes.find(c => c.userId === userId && c.type === type && !c.used && new Date(c.expiresAt) > new Date());
  return code || null;
}

function markCodeUsed(userId: string, type: VerificationCode['type']): void {
  const codes: VerificationCode[] = JSON.parse(localStorage.getItem(VERIFICATION_CODES_KEY) || '[]');
  const updated = codes.map(c => 
    c.userId === userId && c.type === type && !c.used ? { ...c, used: true } : c
  );
  localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(updated));
}

// ─── Email Service (Mock - Replace with real email service) ───────────────────
function sendEmailVerificationCode(email: string, code: string, type: 'email_verification' | '2fa' | 'password_reset' | 'device_verification'): void {
  // In production, integrate with Resend, SendGrid, or similar
  console.log(`[EMAIL] To: ${email}, Code: ${code}, Type: ${type}`);
  // For now, we'll store it in localStorage and show it in console
  // In production, this would send an actual email
  localStorage.setItem(`email_code_${email}`, JSON.stringify({ code, type, sentAt: new Date().toISOString() }));
}

export function getEmailCodeForTesting(email: string): string | null {
  const stored = localStorage.getItem(`email_code_${email}`);
  if (!stored) return null;
  const data = JSON.parse(stored);
  // Code expires after 10 minutes
  if (new Date(data.sentAt).getTime() + VERIFICATION_CODE_EXPIRY < Date.now()) return null;
  return data.code;
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
// REMOVED: ensureDefaultAdmin() used to seed a hardcoded super admin
// (username "admin" with a fixed password) into localStorage on first load, in
// every browser that opened the site. Combined with the client-side gate, that
// was a permanent skeleton key to the CMS.
//
// Identity now lives in Supabase Auth (see src/lib/auth.ts). Staff accounts are
// created deliberately, not seeded, so this local user list starts empty.

// ─── User CRUD ────────────────────────────────────────────────────────────────
export function getUsersList(): AdminUser[] {
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
  approvedBy?: string;  // Super admin who created this account
}): AdminUser {
  const { password, ...rest } = data;
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
  }
  
  const now = new Date();
  const passwordExpiresAt = new Date(now.getTime() + PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  const user: AdminUser = {
    ...rest,
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    passwordHash: simpleHash(password),
    createdAt: now.toISOString(),
    active: true,
    emailVerified: false,  // Requires email verification
    twoFactorEnabled: false,  // Can be enabled later
    approvedBy: data.approvedBy || undefined,
    approvedAt: data.approvedBy ? now.toISOString() : undefined,
    passwordChangedAt: now.toISOString(),
    passwordExpiresAt: passwordExpiresAt.toISOString(),
    requiresPasswordChange: false,
  };
  
  const users = loadUsers();
  users.push(user);
  saveUsers(users);
  
  // Send email verification code
  const verificationCode = generateVerificationCode();
  sendEmailVerificationCode(user.email, verificationCode, 'email_verification');
  saveVerificationCode({
    code: verificationCode,
    type: 'email_verification',
    userId: user.id,
    expiresAt: new Date(Date.now() + VERIFICATION_CODE_EXPIRY).toISOString(),
    attempts: 0,
    used: false,
  });
  
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

// ─── Security Helpers ──────────────────────────────────────────────────────────
function getClientIP(): string {
  // In browser, we can't get real IP, but we can use a fingerprint
  // For production, this should come from server-side
  return typeof window !== 'undefined' 
    ? `${navigator.userAgent.slice(0, 50)}_${navigator.language}_${screen.width}x${screen.height}`
    : 'unknown';
}

function getUserAgent(): string {
  return typeof window !== 'undefined' ? navigator.userAgent : 'unknown';
}

function getLoginAttempts(): LoginAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '[]');
  } catch { return []; }
}

function saveLoginAttempt(attempt: LoginAttempt): void {
  const attempts = getLoginAttempts();
  attempts.unshift(attempt);
  // Keep last 500 attempts
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts.slice(0, 500)));
}

function getBlockedIPs(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BLOCKED_IPS_KEY) || '{}');
  } catch { return {}; }
}

export function blockIP(ip: string): void {
  const blocked = getBlockedIPs();
  blocked[ip] = Date.now() + IP_BLOCK_DURATION;
  localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(blocked));
  createSecurityAlert('suspicious_ip', 'high', `IP blocked due to excessive failed login attempts: ${ip.slice(0, 30)}...`, { ip });
}

function isIPBlocked(ip: string): boolean {
  const blocked = getBlockedIPs();
  const blockUntil = blocked[ip];
  if (!blockUntil) return false;
  if (blockUntil < Date.now()) {
    // Expired, remove
    const updated = { ...blocked };
    delete updated[ip];
    localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(updated));
    return false;
  }
  return true;
}

function createSecurityAlert(
  type: SecurityAlert['type'],
  severity: SecurityAlert['severity'],
  message: string,
  details: Record<string, unknown>
): void {
  try {
    const alerts: SecurityAlert[] = JSON.parse(localStorage.getItem(SECURITY_ALERTS_KEY) || '[]');
    alerts.unshift({
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      resolved: false,
    });
    // Keep last 200 alerts
    localStorage.setItem(SECURITY_ALERTS_KEY, JSON.stringify(alerts.slice(0, 200)));
  } catch { /* non-fatal */ }
}

function checkAccountLockout(user: AdminUser): boolean {
  if (!user.lockedUntil) return false;
  const lockTime = new Date(user.lockedUntil).getTime();
  if (lockTime < Date.now()) {
    // Lock expired, clear it
    updateUser(user.id, { lockedUntil: undefined, failedAttempts: 0 });
    return false;
  }
  return true;
}

function incrementFailedAttempts(user: AdminUser, ip: string): void {
  const attempts = (user.failedAttempts || 0) + 1;
  const updates: Partial<AdminUser> = { failedAttempts: attempts };
  
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
    createSecurityAlert(
      'account_locked',
      'high',
      `Account "${user.username}" locked due to ${attempts} failed login attempts`,
      { username: user.username, userId: user.id, attempts }
    );
    logActivity('security_lock', `Account "${user.username}" locked due to failed attempts`, user.id);
  } else if (attempts >= SUSPICIOUS_ACTIVITY_THRESHOLD) {
    createSecurityAlert(
      'multiple_failures',
      'medium',
      `Multiple failed login attempts for "${user.username}" (${attempts}/${MAX_LOGIN_ATTEMPTS})`,
      { username: user.username, userId: user.id, attempts }
    );
  }
  
  updateUser(user.id, updates);
}

function checkIPAttempts(ip: string): boolean {
  const attempts = getLoginAttempts();
  const recentFailures = attempts.filter(
    a => a.ip === ip && !a.success && new Date(a.timestamp).getTime() > Date.now() - IP_BLOCK_DURATION
  );
  
  if (recentFailures.length >= MAX_ATTEMPTS_PER_IP) {
    blockIP(ip);
    return false; // Blocked
  }
  
  return true; // Allowed
}

// ─── Simple Authentication with Fake Email Verification ─────────────────────
export function initiateLogin(username: string, password: string): { 
  success: boolean; 
  error: string | null; 
  locked: boolean;
  requiresEmailVerification: boolean;
  userId?: string;
} {
  ensureDefaultAdmin();
  const ip = getClientIP();
  const userAgent = getUserAgent();
  
  // Check IP block
  if (isIPBlocked(ip)) {
    saveLoginAttempt({
      id: `attempt_${Date.now()}`,
      username,
      ip,
      userAgent,
      success: false,
      timestamp: new Date().toISOString(),
    });
    return { 
      success: false, 
      error: 'Access denied. Too many failed attempts from this location.', 
      locked: false,
      requiresEmailVerification: false,
    };
  }
  
  // Check IP attempt rate
  if (!checkIPAttempts(ip)) {
    return { 
      success: false, 
      error: 'Access denied. Too many failed attempts from this location.', 
      locked: false,
      requiresEmailVerification: false,
    };
  }
  
  const user = loadUsers().find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.active
  );
  
  if (!user) {
    // Don't reveal if username exists - security best practice
    saveLoginAttempt({
      id: `attempt_${Date.now()}`,
      username,
      ip,
      userAgent,
      success: false,
      timestamp: new Date().toISOString(),
    });
    return { 
      success: false, 
      error: 'Invalid username or password.', 
      locked: false,
      requiresEmailVerification: false,
    };
  }
  
  // Check account lockout
  if (checkAccountLockout(user)) {
    saveLoginAttempt({
      id: `attempt_${Date.now()}`,
      username,
      ip,
      userAgent,
      success: false,
      timestamp: new Date().toISOString(),
      userId: user.id,
    });
    const lockUntil = new Date(user.lockedUntil!).toLocaleString();
    return { 
      success: false, 
      error: `Account locked until ${lockUntil}. Too many failed login attempts.`, 
      locked: true,
      requiresEmailVerification: false,
    };
  }
  
  // Verify password
  const passwordCorrect = user.passwordHash === simpleHash(password);
  
  if (!passwordCorrect) {
    incrementFailedAttempts(user, ip);
    saveLoginAttempt({
      id: `attempt_${Date.now()}`,
      username,
      ip,
      userAgent,
      success: false,
      timestamp: new Date().toISOString(),
      userId: user.id,
    });
    
    // Check if we should block IP
    const recentFailures = getLoginAttempts().filter(
      a => a.ip === ip && !a.success && new Date(a.timestamp).getTime() > Date.now() - 60000
    );
    if (recentFailures.length >= 5) {
      blockIP(ip);
    }
    
    return { 
      success: false, 
      error: 'Invalid username or password.', 
      locked: false,
      requiresEmailVerification: false,
    };
  }
  
  // Password correct! Always require "email verification" (fake security)
  // Store pending login for verification
  localStorage.setItem('pending_login', JSON.stringify({
    userId: user.id,
    ip,
    userAgent,
    timestamp: Date.now(),
  }));
  
  return { 
    success: false, 
    error: 'Email verification required. Please check your email for a verification code.', 
    locked: false,
    requiresEmailVerification: true,
    userId: user.id,
  };
}

/**
 * @deprecated Retired. Sign-in goes through Supabase Auth (src/lib/auth.ts).
 *
 * This used to compare against a single hardcoded constant shared by every
 * user and shipped in the public bundle, presented as "email verification"
 * even though no email was ever sent. The constant is gone and this path is
 * permanently closed; it is kept only so any stale reference fails safely.
 */
export function verifyCode(_userId: string, _code: string): {
  success: boolean;
  error: string | null;
  user?: AdminUser;
} {
  return {
    success: false,
    error: 'This sign-in method has been retired. Please sign in with your email and password.',
  };
}

/**
 * @deprecated Retired alongside verifyCode(). Sign-in is Supabase Auth now.
 * Kept exported only so any stale import fails safely rather than at build time.
 */
export function loginUser(username: string, password: string): { user: AdminUser | null; error: string | null; locked: boolean } {
  const result = initiateLogin(username, password);
  
  if (!result.success) {
    return { user: null, error: result.error, locked: result.locked };
  }
  
  // If login requires email verification, return error (user needs to verify code)
  if (result.requiresEmailVerification) {
    return { user: null, error: result.error || 'Email verification required.', locked: false };
  }
  
  const user = result.userId ? getUser(result.userId) : null;
  return { user: user || null, error: null, locked: false };
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
    userDisplayName: userDisplayName ?? (userId ? getUser(userId)?.displayName : undefined),
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
 * Erase the activity trail for everyone.
 *
 * This only emptied the current browser before, so pressing it looked like it
 * worked and the entries came straight back on the next visit from another
 * computer. It clears the server now, which is also why it asks first.
 */
export async function clearActivityLog(): Promise<void> {
  localStorage.removeItem(ACTIVITY_KEY);
  const { supabase } = await import('./supabaseClient');
  if (!supabase) return;
  const { error } = await supabase.from('activity_log').delete().neq('id', '');
  if (error) throw new Error(error.message);
}

// ─── Security Functions ───────────────────────────────────────────────────────
export function getSecurityAlerts(): SecurityAlert[] {
  try {
    return JSON.parse(localStorage.getItem(SECURITY_ALERTS_KEY) || '[]');
  } catch { return []; }
}

export function resolveSecurityAlert(alertId: string, resolvedBy: string): void {
  const alerts = getSecurityAlerts();
  const idx = alerts.findIndex(a => a.id === alertId);
  if (idx !== -1) {
    alerts[idx].resolved = true;
    alerts[idx].resolvedBy = resolvedBy;
    alerts[idx].resolvedAt = new Date().toISOString();
    localStorage.setItem(SECURITY_ALERTS_KEY, JSON.stringify(alerts));
  }
}

export function getLoginAttemptsHistory(limit = 100): LoginAttempt[] {
  return getLoginAttempts().slice(0, limit);
}

export function getBlockedIPsList(): Array<{ ip: string; blockedUntil: string }> {
  const blocked = getBlockedIPs();
  return Object.entries(blocked)
    .filter(([_, until]) => until > Date.now())
    .map(([ip, until]) => ({
      ip,
      blockedUntil: new Date(until).toISOString(),
    }));
}

export function unblockIP(ip: string): void {
  const blocked = getBlockedIPs();
  delete blocked[ip];
  localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(blocked));
}

export function unlockUser(userId: string, unlockedBy: string): void {
  const user = getUser(userId);
  if (user) {
    updateUser(userId, { 
      lockedUntil: undefined, 
      failedAttempts: 0 
    });
    logActivity('security_unlock', `Account "${user.username}" unlocked by ${unlockedBy}`, userId);
  }
}
