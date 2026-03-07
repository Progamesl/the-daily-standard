/**
 * Security Dashboard
 * Monitor login attempts, blocked IPs, security alerts, and account lockouts.
 * Only accessible to super admins.
 */

import { useMemo, useState } from 'react';
import {
  Shield, AlertTriangle, Lock, Unlock, X, CheckCircle2,
  AlertCircle, Ban, Eye, Clock, User, Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getSecurityAlerts,
  getLoginAttemptsHistory,
  getBlockedIPsList,
  resolveSecurityAlert,
  unblockIP,
  unlockUser,
  getUsersList,
  blockIP,
  type SecurityAlert,
  type LoginAttempt,
} from '@/lib/adminUserService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SEVERITY_COLORS: Record<SecurityAlert['severity'], string> = {
  low: 'bg-blue-100 text-blue-700 border-blue-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export default function AdminSecurity() {
  const { currentUser } = useAdminAuth();
  const [alerts, setAlerts] = useState(getSecurityAlerts());
  const [blockedIPs, setBlockedIPs] = useState(getBlockedIPsList());
  
  const loginAttempts = useMemo(() => getLoginAttemptsHistory(100), []);
  const users = useMemo(() => getUsersList(), []);
  const lockedUsers = useMemo(() => users.filter(u => u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now()), [users]);
  
  const recentFailures = useMemo(() => 
    loginAttempts.filter(a => !a.success).slice(0, 20),
    [loginAttempts]
  );
  
  const suspiciousIPs = useMemo(() => {
    const ipCounts = new Map<string, number>();
    recentFailures.forEach(attempt => {
      ipCounts.set(attempt.ip, (ipCounts.get(attempt.ip) || 0) + 1);
    });
    return Array.from(ipCounts.entries())
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [recentFailures]);
  
  const unresolvedAlerts = useMemo(() => alerts.filter(a => !a.resolved), [alerts]);
  const criticalAlerts = useMemo(() => unresolvedAlerts.filter(a => a.severity === 'critical' || a.severity === 'high'), [unresolvedAlerts]);

  const handleResolveAlert = (alertId: string) => {
    if (!currentUser) return;
    resolveSecurityAlert(alertId, currentUser.displayName);
    setAlerts(getSecurityAlerts());
    toast.success('Alert resolved');
  };

  const handleUnblockIP = (ip: string) => {
    unblockIP(ip);
    setBlockedIPs(getBlockedIPsList());
    toast.success('IP unblocked');
  };

  const handleUnlockUser = (userId: string) => {
    if (!currentUser) return;
    unlockUser(userId, currentUser.displayName);
    toast.success('User unlocked');
    // Refresh page data
    setTimeout(() => window.location.reload(), 500);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Access Denied</p>
                <p className="text-sm text-red-700 mt-1">Only super administrators can access the security dashboard.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-3">
          <Shield className="h-8 w-8 text-red-600" />
          Security Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Monitor login attempts, security alerts, and account lockouts</p>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="h-5 w-5" />
              Critical Security Alerts ({criticalAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-start justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={SEVERITY_COLORS[alert.severity]}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">{alert.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-slate-700">{alert.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{timeAgo(alert.timestamp)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Unresolved Alerts</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{unresolvedAlerts.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Blocked IPs</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{blockedIPs.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Ban className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Locked Accounts</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{lockedUsers.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Lock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Failed Attempts (24h)</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {loginAttempts.filter(a => !a.success && new Date(a.timestamp).getTime() > Date.now() - 86400000).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 20).map(alert => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start justify-between p-4 rounded-lg border",
                  alert.resolved
                    ? "bg-slate-50 border-slate-200"
                    : SEVERITY_COLORS[alert.severity].replace('bg-', 'bg-').replace('text-', 'border-')
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={SEVERITY_COLORS[alert.severity]}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium text-slate-900">{alert.type.replace(/_/g, ' ')}</span>
                    {alert.resolved && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-700">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatTime(alert.timestamp)}
                    {alert.resolvedBy && ` · Resolved by ${alert.resolvedBy}`}
                  </p>
                </div>
                {!alert.resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Locked Accounts */}
      {lockedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Locked Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lockedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-slate-900">{user.displayName} ({user.username})</p>
                      <p className="text-sm text-slate-600">
                        Locked until {new Date(user.lockedUntil!).toLocaleString()}
                        {user.failedAttempts && ` · ${user.failedAttempts} failed attempts`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnlockUser(user.id)}
                    className="gap-2"
                  >
                    <Unlock className="h-4 w-4" />
                    Unlock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocked IPs */}
      {blockedIPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Blocked IP Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockedIPs.map(({ ip, blockedUntil }) => (
                <div key={ip} className="flex items-center justify-between p-4 rounded-lg border border-orange-200 bg-orange-50">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-900">{ip.slice(0, 60)}...</p>
                      <p className="text-xs text-slate-600">Blocked until {new Date(blockedUntil).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnblockIP(ip)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Login Attempts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Login Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Username</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">IP</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {loginAttempts.slice(0, 50).map(attempt => (
                  <tr key={attempt.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-600">{timeAgo(attempt.timestamp)}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{attempt.username}</td>
                    <td className="py-3 px-4 text-sm font-mono text-slate-600">{attempt.ip.slice(0, 40)}...</td>
                    <td className="py-3 px-4 text-center">
                      {attempt.success ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <X className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Suspicious IPs */}
      {suspiciousIPs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suspicious IP Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspiciousIPs.map(([ip, count]) => (
                <div key={ip} className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-mono text-sm font-medium text-slate-900">{ip.slice(0, 60)}...</p>
                      <p className="text-xs text-slate-600">{count} failed attempts</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      blockIP(ip);
                      setBlockedIPs(getBlockedIPsList());
                      toast.success('IP blocked');
                    }}
                    className="gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    Block IP
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
