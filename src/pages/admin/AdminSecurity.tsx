/**
 * Security — everything here is real, enforced, and checked rather than claimed.
 *
 * The original version of this page read four localStorage keys that nothing
 * had written to since sign-in moved to Supabase, so it was guaranteed to be
 * empty on every computer forever, and its "Block IP" button wrote to a list no
 * server consulted — an editor could believe they had shut an attacker out
 * while nothing at all had changed.
 *
 * The rule for everything on this page: if it cannot be verified or enforced,
 * it does not appear. What survives is
 *   · problems that actually exist right now, each with the button that fixes it
 *   · who can get in, sorted so the worrying accounts float to the top
 *   · every sign-in attempt, with the odd ones called out
 *   · a check that attacks the site from outside and reports what held
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, AlertTriangle, Clock, Globe, RefreshCw,
  Power, KeyRound, UserX, CheckCircle2, XCircle, MinusCircle, Loader2,
  ChevronRight, Monitor,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchLoginAttempts, type LoginAttemptRow } from '@/lib/securityTracking';
import {
  listStaffWithSignIns, updateStaff, resetStaffPassword,
  type StaffMember,
} from '@/lib/staffService';
import { runDefenceCheck, type CheckResult } from '@/lib/defenceCheck';
import { ROLE_LABELS, logActivity, canDo } from '@/lib/adminUserService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DAY = 86_400_000;
/** Past this with no sign-in, an account is very likely a student who left. */
const DORMANT_DAYS = 90;

function timeAgo(iso?: string | null): string {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (!t) return 'unknown';
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleDateString();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / DAY);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 31) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

/** "Chrome on Windows", rather than 140 characters of user-agent string. */
function describeBrowser(ua: string): string {
  if (!ua) return 'unknown browser';
  const browser =
    /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) ? 'Safari' : 'a browser';
  const os =
    /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'an iPhone or iPad' :
    /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'a Mac' :
    /Linux/.test(ua) ? 'Linux' : 'an unknown device';
  return `${browser} on ${os}`;
}

/** A problem worth an editor-in-chief's attention, and what to do about it. */
interface Concern {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  member?: StaffMember;
  action?: { label: string; kind: 'suspend' | 'reset' };
}

export default function AdminSecurity() {
  const { currentUser } = useAdminAuth();
  const canManage = Boolean(currentUser && canDo(currentUser, 'manage_users'));

  const [attempts, setAttempts] = useState<LoginAttemptRow[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [checks, setChecks] = useState<CheckResult[] | null>(null);
  const [checking, setChecking] = useState(false);

  const [confirm, setConfirm] = useState<{ member: StaffMember; kind: 'suspend' } | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchLoginAttempts(300),
      listStaffWithSignIns().catch(() => [] as StaffMember[]),
    ])
      .then(([a, s]) => {
        if (cancelled) return;
        setAttempts(a);
        setStaff(s);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  // ── Signals ───────────────────────────────────────────────────────────────

  const failures = useMemo(() => attempts.filter(a => !a.success), [attempts]);
  const last24h = useMemo(() => {
    const cutoff = Date.now() - DAY;
    return attempts.filter(a => new Date(a.timestamp).getTime() >= cutoff);
  }, [attempts]);

  /**
   * Accounts somebody is guessing at: three or more failures against one name
   * inside a day. One failure is a reporter mistyping their password on a
   * Monday morning; three from two addresses is someone trying.
   */
  const underAttack = useMemo(() => {
    const cutoff = Date.now() - DAY;
    const byUser = new Map<string, LoginAttemptRow[]>();
    for (const a of failures) {
      if (new Date(a.timestamp).getTime() < cutoff) continue;
      byUser.set(a.username, [...(byUser.get(a.username) ?? []), a]);
    }
    return Array.from(byUser.entries())
      .filter(([, list]) => list.length >= 3)
      .map(([username, list]) => ({
        username,
        count: list.length,
        addresses: Array.from(new Set(list.map(l => l.ip))),
        latest: list[0].timestamp,
        account: staff.find(s => s.email === username || s.username === username) ?? null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [failures, staff]);

  /** Every device/address a person has ever successfully signed in from. */
  const knownFor = useMemo(() => {
    const map = new Map<string, { devices: Set<string>; addresses: Set<string> }>();
    for (const a of [...attempts].reverse()) {
      if (!a.success) continue;
      if (!map.has(a.username)) map.set(a.username, { devices: new Set(), addresses: new Set() });
      map.get(a.username)!.devices.add(describeBrowser(a.userAgent));
      map.get(a.username)!.addresses.add(a.ip);
    }
    return map;
  }, [attempts]);

  /**
   * Note the sign-ins worth a second look.
   *
   * Computed oldest-first so "first time from this device" means what it says.
   */
  const annotated = useMemo(() => {
    const seenDevice = new Map<string, Set<string>>();
    const seenIp = new Map<string, Set<string>>();
    const out = new Map<string, string[]>();
    for (const a of [...attempts].reverse()) {
      const notes: string[] = [];
      const device = describeBrowser(a.userAgent);
      if (a.success) {
        const devices = seenDevice.get(a.username) ?? new Set();
        const ips = seenIp.get(a.username) ?? new Set();
        if (devices.size && !devices.has(device)) notes.push('first time from this device');
        if (ips.size && !ips.has(a.ip)) notes.push('new address');
        devices.add(device); ips.add(a.ip);
        seenDevice.set(a.username, devices); seenIp.set(a.username, ips);
        const hour = new Date(a.timestamp).getHours();
        if (hour >= 1 && hour < 5) notes.push('middle of the night');
      }
      out.set(a.id, notes);
    }
    return out;
  }, [attempts]);

  const dormant = useMemo(
    () => staff.filter(s =>
      s.active && s.hasSignInData && s.lastLogin &&
      Date.now() - new Date(s.lastLogin).getTime() > DORMANT_DAYS * DAY),
    [staff],
  );

  const neverUsed = useMemo(
    () => staff.filter(s => s.active && s.hasSignInData && !s.lastLogin),
    [staff],
  );

  const inactive = useMemo(() => staff.filter(s => !s.active), [staff]);

  /** Everything that is actually wrong, worst first. */
  const concerns = useMemo<Concern[]>(() => {
    const list: Concern[] = [];

    for (const row of underAttack) {
      list.push({
        id: `attack-${row.username}`,
        severity: 'high',
        title: `Someone is trying passwords on ${row.username}`,
        detail: `${row.count} failed attempts in the last day from ${row.addresses.length} ${row.addresses.length === 1 ? 'address' : 'addresses'}, most recently ${timeAgo(row.latest)}.`,
        member: row.account ?? undefined,
        action: row.account?.active ? { label: 'Turn this account off', kind: 'suspend' } : undefined,
      });
    }

    for (const s of dormant) {
      list.push({
        id: `dormant-${s.id}`,
        severity: 'medium',
        title: `${s.displayName} has not signed in for ${Math.round((Date.now() - new Date(s.lastLogin!).getTime()) / DAY)} days`,
        detail: `Their account still works. If they have left the paper or graduated, this is a way in that nobody is watching.`,
        member: s,
        action: { label: 'Turn this account off', kind: 'suspend' },
      });
    }

    for (const s of neverUsed) {
      list.push({
        id: `unused-${s.id}`,
        severity: 'low',
        title: `${s.displayName} has never signed in`,
        detail: 'The account was made but never used. Either they need their password, or it should not exist.',
        member: s,
        action: { label: 'Set a new password', kind: 'reset' },
      });
    }

    const failed = checks?.filter(c => c.status === 'fail' && c.id !== 'readers') ?? [];
    for (const c of failed) {
      list.push({
        id: `check-${c.id}`,
        severity: 'high',
        title: `A stranger can ${c.attempt.toLowerCase()}`,
        detail: `${c.detail} ${c.consequence ?? ''}`.trim(),
      });
    }

    const order = { high: 0, medium: 1, low: 2 };
    return list.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [underAttack, dormant, neverUsed, checks]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const doSuspend = async (member: StaffMember) => {
    setBusyId(member.id);
    try {
      await updateStaff(member.id, { active: false });
      logActivity('user_updated', `Turned off the account for ${member.displayName}`,
        currentUser?.id, member.id, currentUser?.displayName);
      toast.success(`${member.displayName} can no longer sign in.`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn the account off.');
    } finally { setBusyId(null); setConfirm(null); }
  };

  const doReinstate = async (member: StaffMember) => {
    setBusyId(member.id);
    try {
      await updateStaff(member.id, { active: true });
      logActivity('user_updated', `Turned the account for ${member.displayName} back on`,
        currentUser?.id, member.id, currentUser?.displayName);
      toast.success(`${member.displayName} can sign in again.`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn the account back on.');
    } finally { setBusyId(null); }
  };

  const doReset = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 10) {
      toast.error('Use at least 10 characters.');
      return;
    }
    setBusyId(resetTarget.id);
    try {
      await resetStaffPassword(resetTarget.id, newPassword);
      logActivity('user_updated', `Reset the password for ${resetTarget.displayName}`,
        currentUser?.id, resetTarget.id, currentUser?.displayName);
      toast.success(`Password changed. Give it to ${resetTarget.displayName} in person, not by email.`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the password.');
    } finally { setBusyId(null); }
  };

  const runChecks = useCallback(async () => {
    setChecking(true);
    try {
      setChecks(await runDefenceCheck());
    } finally {
      setChecking(false);
    }
  }, []);

  const checksPassed = checks?.filter(c => c.status === 'pass').length ?? 0;
  const checksFailed = checks?.filter(c => c.status === 'fail').length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  const rosterByRisk = useMemo(() => {
    const risk = (s: StaffMember) => {
      if (!s.active) return 4;
      if (s.hasSignInData && !s.lastLogin) return 0;
      if (s.hasSignInData && s.lastLogin && Date.now() - new Date(s.lastLogin).getTime() > DORMANT_DAYS * DAY) return 1;
      return 2;
    };
    return [...staff].sort((a, b) => risk(a) - risk(b) ||
      new Date(b.lastLogin ?? 0).getTime() - new Date(a.lastLogin ?? 0).getTime());
  }, [staff]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-400" />
            Security
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Who can get into the site, who has been trying, and what is holding.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0"
          onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* ── Needs attention ─────────────────────────────────────────────── */}
      <Card className={cn('mb-6', concerns.length ? 'border-amber-200' : 'border-green-200')}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {concerns.length ? (
              <><ShieldAlert className="h-4 w-4 text-amber-600" />
                {concerns.length} thing{concerns.length === 1 ? '' : 's'} to look at</>
            ) : (
              <><ShieldCheck className="h-4 w-4 text-green-600" />Nothing needs your attention</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400 flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />Checking…
            </p>
          ) : concerns.length === 0 ? (
            <p className="text-sm text-slate-600">
              Nobody is being locked out, no account has been sitting unused, and every account that
              exists is one somebody is using.
              {!checks && ' Run the check below to test the site’s defences as an outsider would.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {concerns.map(c => (
                <div key={c.id} className={cn(
                  'flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3',
                  c.severity === 'high' ? 'border-red-200 bg-red-50/50'
                    : c.severity === 'medium' ? 'border-amber-200 bg-amber-50/40'
                    : 'border-slate-200',
                )}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{c.detail}</p>
                  </div>
                  {canManage && c.action && c.member && (
                    <Button
                      size="sm" variant="outline" className="shrink-0 gap-1.5"
                      disabled={busyId === c.member.id}
                      onClick={() => {
                        if (c.action!.kind === 'reset') setResetTarget(c.member!);
                        else setConfirm({ member: c.member!, kind: c.action!.kind });
                      }}
                    >
                      {c.action.kind === 'reset' ? <KeyRound className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {c.action.label}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Live defence check ──────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="h-4 w-4 text-slate-400" />
                Check our defences
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Tries to break in from outside, using the same public key any visitor&rsquo;s browser has,
                and reports what actually happened. Nothing is claimed here that was not just tested.
              </p>
            </div>
            <Button size="sm" onClick={runChecks} disabled={checking} className="gap-1.5 shrink-0">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {checking ? 'Trying…' : checks ? 'Run again' : 'Run the check'}
            </Button>
          </div>
        </CardHeader>
        {checks && (
          <CardContent>
            <p className={cn('text-sm font-semibold mb-3',
              checksFailed ? 'text-red-700' : 'text-green-700')}>
              {checksFailed === 0
                ? `Everything held — ${checksPassed} of ${checks.length} checks passed.`
                : `${checksFailed} of ${checks.length} checks failed. See above.`}
            </p>
            <div className="divide-y divide-slate-100">
              {checks.map(c => (
                <div key={c.id} className="flex items-start gap-3 py-2.5">
                  {c.status === 'pass' ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    : c.status === 'fail' ? <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    : <MinusCircle className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900">
                      {c.attempt}
                      <span className="text-slate-400"> — expected: {c.expectation.toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Who can get in ──────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-slate-400" />
            Who can get into the site
            <span className="text-xs font-normal text-slate-400">
              {staff.filter(s => s.active).length} of {staff.length} accounts can sign in
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400 flex items-center gap-2 py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />Loading the roster…
            </p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No staff accounts could be loaded.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rosterByRisk.map(s => {
                const never = s.hasSignInData && !s.lastLogin;
                const stale = s.hasSignInData && s.lastLogin &&
                  Date.now() - new Date(s.lastLogin).getTime() > DORMANT_DAYS * DAY;
                const known = knownFor.get(s.email) ?? knownFor.get(s.username);
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                        {s.displayName}
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {ROLE_LABELS[s.role]}
                        </Badge>
                        {!s.active && <Badge variant="outline" className="text-[10px] text-slate-500">cannot sign in</Badge>}
                        {never && s.active && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200">never used</Badge>}
                        {stale && s.active && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200">dormant</Badge>}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {s.email} · last signed in {timeAgo(s.lastLogin)}
                        {known && known.devices.size > 0 && ` · ${known.devices.size} device${known.devices.size === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.active ? (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-slate-600"
                              disabled={busyId === s.id}
                              onClick={() => setResetTarget(s)}
                              title="Change their password — this is what gets somebody off a device they still have">
                              <KeyRound className="h-3.5 w-3.5" />Password
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={busyId === s.id || s.id === currentUser?.id}
                              onClick={() => setConfirm({ member: s, kind: 'suspend' })}
                              title={s.id === currentUser?.id ? 'You cannot turn off your own account' : 'Stop this account signing in'}>
                              <UserX className="h-3.5 w-3.5" />Turn off
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8"
                            disabled={busyId === s.id}
                            onClick={() => doReinstate(s)}>
                            Turn back on
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-400">
            Turning an account off refuses it at the sign-in page on every computer. To get somebody off a
            device they are still holding, change their password — that ends the session straight away.
          </p>
        </CardContent>
      </Card>

      {/* ── Sign-in attempts ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Sign-in attempts
            <span className="text-xs font-normal text-slate-400">
              {last24h.filter(a => a.success).length} in, {last24h.filter(a => !a.success).length} refused, last 24 hours
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400 flex items-center gap-2 py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />Loading…
            </p>
          ) : attempts.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-500">Nothing recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Attempts appear here from the next time anybody signs in.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attempts.slice(0, 80).map(a => {
                const notes = annotated.get(a.id) ?? [];
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', a.success ? 'bg-green-500' : 'bg-red-500')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 truncate">
                        <span className="font-medium">{a.username}</span>
                        <span className="text-slate-500">{a.success ? ' signed in' : ' was refused'}</span>
                        {notes.map(n => (
                          <Badge key={n} variant="outline"
                            className="ml-1.5 text-[10px] text-amber-700 border-amber-200 align-middle">
                            {n}
                          </Badge>
                        ))}
                      </p>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                        <Monitor className="h-3 w-3" />{describeBrowser(a.userAgent)}
                        <Globe className="h-3 w-3 ml-1" />{a.ip}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(a.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Confirmations ───────────────────────────────────────────────── */}
      <AlertDialog open={!!confirm} onOpenChange={o => { if (!o && !busyId) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop this account signing in?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.member.displayName} will be refused at the sign-in page from now on, on every
              computer. Their stories stay exactly where they are, and you can turn the account back on
              at any time.
              <br /><br />
              If they are signed in somewhere right now — a laptop left open, say — that session can keep
              working for up to an hour before it has to ask for a token again. To end it immediately,
              change their password instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busyId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!busyId}
              className="bg-red-600 hover:bg-red-700"
              onClick={e => { e.preventDefault(); if (confirm) doSuspend(confirm.member); }}
            >
              {busyId ? 'Working…' : 'Turn the account off'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetTarget} onOpenChange={o => { if (!o && !busyId) { setResetTarget(null); setNewPassword(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set a new password for {resetTarget?.displayName}</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces their password immediately. Give it to them in person or by text — not by
              email, which is the first place an attacker would look.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Input
              autoFocus
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 10 characters"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              {newPassword.length === 0
                ? 'Three unrelated words is easier to remember and harder to guess than a short one.'
                : newPassword.length < 10
                  ? `${10 - newPassword.length} more character${10 - newPassword.length === 1 ? '' : 's'} needed.`
                  : 'Long enough.'}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busyId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!busyId || newPassword.length < 10}
              onClick={e => { e.preventDefault(); doReset(); }}
            >
              {busyId ? 'Changing…' : 'Change the password'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!canManage && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          You can see this page but not act on it. Turning accounts off and changing passwords is for
          an editor-in-chief.
        </p>
      )}
    </div>
  );
}
