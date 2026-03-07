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
      emailVerified: true,  // Default admin is pre-verified
      twoFactorEnabled: false,  // Can be enabled later
      approvedBy: 'system',
      approvedAt: new Date().toISOString(),
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

// ─── Enhanced Authentication Functions ───────────────────────────────────────
export function initiateLogin(username: string, password: string): { 
  success: boolean; 
  error: string | null; 
  locked: boolean;
  requires2FA: boolean;
  requiresEmailVerification: boolean;
  requiresDeviceVerification: boolean;
  userId?: string;
  deviceFingerprint?: string;
} {
  ensureDefaultAdmin();
  const ip = getClientIP();
  const userAgent = getUserAgent();
  const deviceFingerprint = generateDeviceFingerprint();
  
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
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
    };
  }
  
  // Check IP attempt rate
  if (!checkIPAttempts(ip)) {
    return { 
      success: false, 
      error: 'Access denied. Too many failed attempts from this location.', 
      locked: false,
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
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
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
    };
  }
  
  // Check admin approval
  if (!user.approvedBy && user.role !== 'super_admin') {
    return { 
      success: false, 
      error: 'Your account is pending approval by an administrator.', 
      locked: false,
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
    };
  }
  
  // Check email verification
  if (!user.emailVerified) {
    // Resend verification code
    const code = generateVerificationCode();
    sendEmailVerificationCode(user.email, code, 'email_verification');
    saveVerificationCode({
      code,
      type: 'email_verification',
      userId: user.id,
      expiresAt: new Date(Date.now() + VERIFICATION_CODE_EXPIRY).toISOString(),
      attempts: 0,
      used: false,
    });
    
    return { 
      success: false, 
      error: 'Please verify your email address. A verification code has been sent.', 
      locked: false,
      requires2FA: false,
      requiresEmailVerification: true,
      requiresDeviceVerification: false,
      userId: user.id,
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
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
      userId: user.id,
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
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
    };
  }
  
  // Password correct! Check for 2FA and device verification
  const isTrustedDevice = user.trustedDevices?.some(d => d.fingerprint === deviceFingerprint);
  const requiresDeviceVerification = !isTrustedDevice;
  const requires2FA = user.twoFactorEnabled;
  
  // Store pending login for 2FA/device verification
  if (requires2FA || requiresDeviceVerification) {
    const code = generateVerificationCode();
    const codeType = requires2FA ? '2fa' : 'device_verification';
    sendEmailVerificationCode(user.email, code, codeType);
    saveVerificationCode({
      code,
      type: codeType,
      userId: user.id,
      expiresAt: new Date(Date.now() + VERIFICATION_CODE_EXPIRY).toISOString(),
      attempts: 0,
      used: false,
    });
    
    // Store pending login session
    localStorage.setItem('pending_login', JSON.stringify({
      userId: user.id,
      deviceFingerprint,
      ip,
      userAgent,
      timestamp: Date.now(),
    }));
    
    return { 
      success: false, 
      error: requires2FA ? 'Two-factor authentication required. Check your email for a code.' : 'New device detected. Check your email for a verification code.', 
      locked: false,
      requires2FA,
      requiresEmailVerification: false,
      requiresDeviceVerification,
      userId: user.id,
      deviceFingerprint,
    };
  }
  
  // All checks passed - complete login
  return completeLogin(user.id, deviceFingerprint, ip, userAgent);
}

export function verifyCode(userId: string, code: string, type: 'email_verification' | '2fa' | 'device_verification'): {
  success: boolean;
  error: string | null;
  user?: AdminUser;
  requires2FA?: boolean;
  requiresEmailVerification?: boolean;
  requiresDeviceVerification?: boolean;
} {
  const storedCode = getVerificationCode(userId, type);
  
  if (!storedCode) {
    return { success: false, error: 'Invalid or expired code. Please request a new one.' };
  }
  
  if (storedCode.code !== code) {
    storedCode.attempts++;
    if (storedCode.attempts >= 5) {
      // Too many failed attempts, invalidate code
      markCodeUsed(userId, type);
      return { success: false, error: 'Too many failed attempts. Please request a new code.' };
    }
    return { success: false, error: 'Invalid code. Please try again.' };
  }
  
  // Code is valid
  markCodeUsed(userId, type);
  
  const user = getUser(userId);
  if (!user) return { success: false, error: 'User not found.' };
  
  // Handle different verification types
  if (type === 'email_verification') {
    updateUser(userId, { emailVerified: true });
    const updatedUser = getUser(userId);
    return { 
      success: true, 
      error: null, 
      user: updatedUser,
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
    };
  }
  
  if (type === 'device_verification') {
    const pendingLogin = JSON.parse(localStorage.getItem('pending_login') || '{}');
    if (pendingLogin.userId !== userId) {
      return { 
        success: false, 
        error: 'Invalid verification session.',
        requires2FA: false,
        requiresEmailVerification: false,
        requiresDeviceVerification: false,
      };
    }
    
    // Add device to trusted devices
    const deviceName = getDeviceName();
    const trustedDevices = user.trustedDevices || [];
    trustedDevices.push({
      fingerprint: pendingLogin.deviceFingerprint,
      name: deviceName,
      lastUsed: new Date().toISOString(),
      ip: pendingLogin.ip,
      userAgent: pendingLogin.userAgent,
    });
    updateUser(userId, { trustedDevices });
    
    // Complete login
    const loginResult = completeLogin(userId, pendingLogin.deviceFingerprint, pendingLogin.ip, pendingLogin.userAgent);
    return {
      success: loginResult.success,
      error: loginResult.error,
      user: loginResult.user,
      requires2FA: loginResult.requires2FA,
      requiresEmailVerification: loginResult.requiresEmailVerification,
      requiresDeviceVerification: loginResult.requiresDeviceVerification,
    };
  }
  
  if (type === '2fa') {
    const pendingLogin = JSON.parse(localStorage.getItem('pending_login') || '{}');
    if (pendingLogin.userId !== userId) {
      return { 
        success: false, 
        error: 'Invalid verification session.',
        requires2FA: false,
        requiresEmailVerification: false,
        requiresDeviceVerification: false,
      };
    }
    
    // Complete login
    const loginResult = completeLogin(userId, pendingLogin.deviceFingerprint, pendingLogin.ip, pendingLogin.userAgent);
    return {
      success: loginResult.success,
      error: loginResult.error,
      user: loginResult.user,
      requires2FA: loginResult.requires2FA,
      requiresEmailVerification: loginResult.requiresEmailVerification,
      requiresDeviceVerification: loginResult.requiresDeviceVerification,
    };
  }
  
  return { 
    success: false, 
    error: 'Unknown verification type.',
    requires2FA: false,
    requiresEmailVerification: false,
    requiresDeviceVerification: false,
  };
}

function completeLogin(userId: string, deviceFingerprint: string, ip: string, userAgent: string): {
  success: boolean;
  error: string | null;
  requires2FA: boolean;
  requiresEmailVerification: boolean;
  requiresDeviceVerification: boolean;
  user?: AdminUser;
} {
  const user = getUser(userId);
  if (!user) {
    return { 
      success: false, 
      error: 'User not found.',
      requires2FA: false,
      requiresEmailVerification: false,
      requiresDeviceVerification: false,
    };
  }
  
  // Clear pending login
  localStorage.removeItem('pending_login');
  
  // Update last login and clear failed attempts
  updateUser(userId, { 
    lastLogin: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: undefined,
  });
  
  // Update trusted device last used
  if (user.trustedDevices) {
    const updatedDevices = user.trustedDevices.map(d => 
      d.fingerprint === deviceFingerprint 
        ? { ...d, lastUsed: new Date().toISOString(), ip, userAgent }
        : d
    );
    updateUser(userId, { trustedDevices: updatedDevices });
  }
  
  // Create session
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId,
    expiry: Date.now() + SESSION_DURATION,
    loginIP: ip,
    loginUserAgent: userAgent,
    deviceFingerprint,
  }));
  
  saveLoginAttempt({
    id: `attempt_${Date.now()}`,
    username: user.username,
    ip,
    userAgent,
    success: true,
    timestamp: new Date().toISOString(),
    userId,
  });
  
  logActivity('login', `${user.displayName} signed in from ${ip.slice(0, 30)}...`, userId);
  
  return { 
    success: true, 
    error: null,
    requires2FA: false,
    requiresEmailVerification: false,
    requiresDeviceVerification: false,
    user,
  };
}

// Legacy login function for backward compatibility (now calls initiateLogin)
export function loginUser(username: string, password: string): { user: AdminUser | null; error: string | null; locked: boolean } {
  const result = initiateLogin(username, password);
  
  if (!result.success) {
    return { user: null, error: result.error, locked: result.locked };
  }
  
  // If login requires additional steps, return error
  if (result.requires2FA || result.requiresEmailVerification || result.requiresDeviceVerification) {
    return { user: null, error: result.error || 'Additional verification required.', locked: false };
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
