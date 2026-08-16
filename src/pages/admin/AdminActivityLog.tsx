import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Activity, Trash2, RefreshCw, LogIn, LogOut, FileText, User,
  Send, EyeOff, RotateCcw,
} from 'lucide-react';
import { fetchActivityLog, type ActivityLogEntry } from '@/lib/adminUserService';
import { cn } from '@/lib/utils';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login:              <LogIn  className="h-3.5 w-3.5 text-green-500" />,
  logout:             <LogOut className="h-3.5 w-3.5 text-slate-400" />,
  article_created:    <FileText className="h-3.5 w-3.5 text-blue-500" />,
  article_saved:      <FileText className="h-3.5 w-3.5 text-slate-500" />,
  article_published:  <Send className="h-3.5 w-3.5 text-green-600" />,
  article_unpublished:<EyeOff className="h-3.5 w-3.5 text-amber-600" />,
  article_trashed:    <Trash2 className="h-3.5 w-3.5 text-red-500" />,
  article_restored:   <RotateCcw className="h-3.5 w-3.5 text-teal-600" />,
  article_purged:     <Trash2 className="h-3.5 w-3.5 text-red-700" />,
  user_created:       <User  className="h-3.5 w-3.5 text-purple-500" />,
  user_updated:       <User  className="h-3.5 w-3.5 text-slate-500" />,
  user_deleted:       <User  className="h-3.5 w-3.5 text-red-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  login:              'Signed in',
  logout:             'Signed out',
  article_created:    'Story started',
  article_saved:      'Story edited',
  article_published:  'Published',
  article_unpublished:'Taken off the site',
  article_trashed:    'Moved to trash',
  article_restored:   'Restored',
  article_purged:     'Deleted for good',
  user_created:       'Staff added',
  user_updated:       'Staff changed',
  user_deleted:       'Staff removed',
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  // If date is in the future (negative diff), just show the formatted date
  if (diff < 0) {
    return formatTimestamp(iso);
  }
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 2)   return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return formatTimestamp(iso);
}

export default function AdminActivityLog() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery]           = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // The log lives on the server now, so this is what everyone did, not just
  // what happened in this browser.
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchActivityLog()
      .then(entries => { if (!cancelled) setLogs(entries); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    let list = [...logs];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(l =>
        l.description.toLowerCase().includes(q) ||
        l.userDisplayName?.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    }
    if (actionFilter !== 'all') list = list.filter(l => l.action === actionFilter);
    return list;
  }, [logs, query, actionFilter]);


  // Group logs by date
  const grouped = useMemo(() => {
    const groups: { date: string; entries: ActivityLogEntry[] }[] = [];
    let currentDate = '';
    filtered.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      });
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, entries: [] });
      }
      groups[groups.length - 1].entries.push(entry);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            What everyone has done, across the whole newsroom · {logs.length} events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
          {/* There was a "Clear Log" button here. It only ever emptied the
              current browser, and now that the log lives on the server the
              database refuses the delete outright — so it would have reported
              success and changed nothing. A record of who published and who
              deleted what is also worth more when nobody can erase it. */}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Events', value: logs.length },
          { label: 'Logins',       value: logs.filter(l => l.action === 'login').length },
          { label: 'Story Updates',value: logs.filter(l => l.action.startsWith('article')).length },
          { label: 'User Actions', value: logs.filter(l => l.action.startsWith('user')).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity…" className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([action, label]) => (
              <SelectItem key={action} value={action}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="h-6 w-6 text-slate-300 mb-3 animate-spin" />
            <p className="text-sm text-slate-400">Loading the newsroom's activity…</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity className="h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No activity recorded yet.</p>
            <p className="text-xs text-slate-300 mt-1">Actions from staff will appear here.</p>
          </div>
        ) : (
          <div>
            {grouped.map(group => (
              <div key={group.date}>
                <div className="px-6 py-2.5 bg-slate-50 border-b border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.date}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.entries.map(entry => (
                    <div key={entry.id}
                      className="flex items-start gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                      {/* Icon */}
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {ACTION_ICONS[entry.action] ?? <Activity className="h-3.5 w-3.5 text-slate-400" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{entry.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.userDisplayName && (
                            <span className="text-xs text-slate-500">{entry.userDisplayName}</span>
                          )}
                          {entry.userDisplayName && <span className="text-slate-300">·</span>}
                          <span className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                            ACTION_LABELS[entry.action] ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-500'
                          )}>
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-xs text-slate-400 shrink-0 text-right">
                        <p>{timeAgo(entry.timestamp)}</p>
                        <p className="text-[10px] text-slate-300 mt-0.5">{formatTimestamp(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
