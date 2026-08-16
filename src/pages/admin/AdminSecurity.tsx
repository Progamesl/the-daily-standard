/**
 * Security — who has been signing in, and which accounts still can.
 *
 * The previous version showed alerts, blocked IP addresses and locked accounts
 * read out of four localStorage keys that nothing has written to since sign-in
 * moved to Supabase: guaranteed empty on every computer, forever. Worse, its
 * "Block IP" button wrote to a list no server ever consults, so an editor could
 * believe they had shut an attacker out while nothing had changed at all.
 *
 * What is left is what is real and actually enforced:
 *   · every sign-in attempt, from the login_attempts table the real login writes
 *   · repeated failures against one account, the signal worth acting on
 *   · turning an account off, which the sign-in path genuinely checks
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Shield, AlertTriangle, Lock, CheckCircle2, Clock, User, Globe, RefreshCw, Power,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fetchLoginAttempts, type LoginAttemptRow } from '@/lib/securityTracking';
import { listStaff, updateStaff, type StaffMember } from '@/lib/staffService';
import { ROLE_LABELS, logActivity } from '@/lib/adminUserService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** "3 min ago", or a date once that stops being useful. */
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return 'unknown';
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleString();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Chrome on Windows", rather than 140 characters of user-agent string. */
function describeBrowser(ua: string): string {
  if (!ua) return 'unknown browser';
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) ? 'Safari' : 'a browser';
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /iPhone|iPad/.test(ua) ? 'an iPhone or iPad' :
    /Android/.test(ua) ? 'Android' :
    /Mac OS X/.test(ua) ? 'a Mac' :
    /Linux/.test(ua) ? 'Linux' : 'an unknown device';
  return `${browser} on ${os}`;
}

export default function AdminSecurity() {
  const { currentUser } = useAdminAuth();
  const [attempts, setAttempts] = useState<LoginAttemptRow[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [suspendTarget, setSuspendTarget] = useState<StaffMember | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchLoginAttempts(200), listStaff().catch(() => [] as StaffMember[])])
      .then(([a, s]) => {
        if (cancelled) return;
        setAttempts(a);
        setStaff(s);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const failures = useMemo(() => attempts.filter(a => !a.success), [attempts]);

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 86_400_000;
    return attempts.filter(a => new Date(a.timestamp).getTime() >= cutoff);
  }, [attempts]);

  /**
   * Accounts somebody is guessing at.
   *
   * Three or more failures against one username inside a day is the shape of
   * someone trying passwords, rather than a reporter mistyping theirs once on a
   * Monday morning.
   */
  const underAttack = useMemo(() => {
    const cutoff = Date.now() - 86_400_000;
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

  const inactive = useMemo(() => staff.filter(s => !s.active), [staff]);

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await updateStaff(suspendTarget.id, { active: false });
      logActivity(
        'user_updated',
        `Turned off the account for ${suspendTarget.displayName}`,
        currentUser?.id, suspendTarget.id, currentUser?.displayName,
      );
      toast.success(`${suspendTarget.displayName} can no longer sign in.`);
      setSuspendTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn the account off.');
    } finally {
      setBusy(false);
    }
  };

  const handleReactivate = async (member: StaffMember) => {
    try {
      await updateStaff(member.id, { active: true });
      logActivity(
        'user_updated',
        `Turned the account for ${member.displayName} back on`,
        currentUser?.id, member.id, currentUser?.displayName,
      );
      toast.success(`${member.displayName} can sign in again.`);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not turn the account back on.');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-slate-400" />
            Security
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Who has tried to sign in, and which accounts are allowed to.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0"
          onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Signed in today', value: last24h.filter(a => a.success).length, alarming: false },
          { label: 'Refused today', value: last24h.filter(a => !a.success).length, alarming: last24h.some(a => !a.success) },
          { label: 'Accounts being guessed at', value: underAttack.length, alarming: underAttack.length > 0 },
          { label: 'Accounts turned off', value: inactive.length, alarming: false },
        ].map(({ label, value, alarming }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={cn('text-2xl font-bold', alarming ? 'text-red-600' : 'text-slate-900')}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {underAttack.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Someone is trying passwords
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {underAttack.map(row => (
              <div key={row.username} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{row.username}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {row.count} failed attempts in the last day, from {row.addresses.length}{' '}
                    {row.addresses.length === 1 ? 'address' : 'addresses'} · last {timeAgo(row.latest)}
                  </p>
                </div>
                {row.account?.active ? (
                  <Button size="sm" variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100 gap-1.5 shrink-0"
                    onClick={() => setSuspendTarget(row.account)}>
                    <Power className="h-3.5 w-3.5" />
                    Turn this account off
                  </Button>
                ) : row.account ? (
                  <Badge variant="outline" className="shrink-0 text-slate-600">Already turned off</Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-slate-600">No such account</Badge>
                )}
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Turning an account off stops it signing in immediately, on every computer. The person keeps
              their stories, and an Editor-in-Chief can turn it back on.
            </p>
          </CardContent>
        </Card>
      )}

      {inactive.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400" />
              Accounts that cannot sign in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inactive.map(member => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{member.displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{member.email} · {ROLE_LABELS[member.role]}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0"
                  onClick={() => handleReactivate(member)}>
                  Turn back on
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Recent sign-in attempts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center py-12 text-center">
              <RefreshCw className="h-5 w-5 text-slate-300 mb-2 animate-spin" />
              <p className="text-sm text-slate-400">Loading…</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-500">Nothing recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Attempts appear here from the next time anybody signs in.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attempts.slice(0, 60).map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', a.success ? 'bg-green-500' : 'bg-red-500')} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-900 truncate">
                      <span className="font-medium">{a.username}</span>
                      <span className="text-slate-500">{a.success ? ' signed in' : ' was refused'}</span>
                    </p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                      <User className="h-3 w-3" />{describeBrowser(a.userAgent)}
                      <Globe className="h-3 w-3 ml-1" />{a.ip}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(a.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!suspendTarget} onOpenChange={o => { if (!o && !busy) setSuspendTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop this account signing in?</AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.displayName} will be refused at the sign-in page from now on, on every computer.
              Their stories stay exactly where they are, and an Editor-in-Chief can turn the account back on
              at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} className="bg-red-600 hover:bg-red-700"
              onClick={e => { e.preventDefault(); handleSuspend(); }}>
              {busy ? 'Turning off…' : 'Turn the account off'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
