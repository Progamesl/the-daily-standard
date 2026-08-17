import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Activity, Trash2, RefreshCw, LogIn, LogOut, FileText, User,
  Send, EyeOff, RotateCcw, KeyRound, MessageSquare, MonitorPlay,
  Settings as SettingsIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchActivityLog, activityLabel, activityArea, ACTIVITY_AREAS, ACTIVITY_ACTIONS,
  type ActivityLogEntry,
} from '@/lib/adminUserService';
import {
  readPreviousFromLog, saveAdminAuthor, getAdminAuthor, type AdminAuthor,
} from '@/lib/adminDataService';
import { clearMastheadCache } from '@/lib/mastheadService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { cn } from '@/lib/utils';

/**
 * One icon per area rather than per action.
 *
 * The catalogue in adminUserService is the single list of what the newsroom can
 * do; keeping icons keyed by area means adding an action there never leaves a
 * blank space here.
 */
const AREA_ICONS: Record<string, React.ReactNode> = {
  Stories:  <FileText className="h-3.5 w-3.5 text-blue-500" />,
  Staff:    <User className="h-3.5 w-3.5 text-purple-500" />,
  Accounts: <KeyRound className="h-3.5 w-3.5 text-slate-500" />,
  Comments: <MessageSquare className="h-3.5 w-3.5 text-teal-600" />,
  Ads:      <MonitorPlay className="h-3.5 w-3.5 text-amber-600" />,
  Settings: <SettingsIcon className="h-3.5 w-3.5 text-slate-500" />,
  Other:    <Activity className="h-3.5 w-3.5 text-slate-400" />,
};

/** A handful of actions earn their own icon because they are the consequential ones. */
const ACTION_ICONS: Record<string, React.ReactNode> = {
  login:               <LogIn className="h-3.5 w-3.5 text-green-500" />,
  login_failed:        <LogIn className="h-3.5 w-3.5 text-red-500" />,
  logout:              <LogOut className="h-3.5 w-3.5 text-slate-400" />,
  article_published:   <Send className="h-3.5 w-3.5 text-green-600" />,
  article_unpublished: <EyeOff className="h-3.5 w-3.5 text-amber-600" />,
  article_trashed:     <Trash2 className="h-3.5 w-3.5 text-red-500" />,
  article_purged:      <Trash2 className="h-3.5 w-3.5 text-red-700" />,
  article_restored:    <RotateCcw className="h-3.5 w-3.5 text-teal-600" />,
  staff_removed:       <User className="h-3.5 w-3.5 text-red-500" />,
  account_removed:     <KeyRound className="h-3.5 w-3.5 text-red-500" />,
  comment_deleted:     <Trash2 className="h-3.5 w-3.5 text-red-500" />,
  ad_deleted:          <Trash2 className="h-3.5 w-3.5 text-red-500" />,
};

const iconFor = (action: string) =>
  ACTION_ICONS[action] ?? AREA_ICONS[activityArea(action)] ?? AREA_ICONS.Other;

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
  const { currentUser } = useAdminAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery]           = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [areaFilter, setAreaFilter]     = useState<string>('all');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [restoring, setRestoring]   = useState<string | null>(null);

  /** Put a person's earlier values back, from the copy kept in the log. */
  const handleRestore = async (entryId: string, previous: Partial<AdminAuthor>) => {
    if (!previous.id) return;
    setRestoring(entryId);
    try {
      const current = getAdminAuthor(previous.id);
      if (!current && !previous.name) {
        toast.error('That person no longer exists and there is not enough here to rebuild them.');
        return;
      }
      // A removal keeps the whole record; an edit keeps only what changed, so
      // it is laid back over whatever the person looks like now.
      const restored = { ...(current ?? {}), ...previous } as AdminAuthor;
      saveAdminAuthor(restored, currentUser?.id, currentUser?.displayName);
      clearMastheadCache();
      toast.success(`Put back ${restored.name}'s earlier details`);
      setExpanded(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not put it back.');
    } finally {
      setRestoring(null);
    }
  };

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
    if (areaFilter !== 'all') list = list.filter(l => activityArea(l.action) === areaFilter);
    if (actionFilter !== 'all') list = list.filter(l => l.action === actionFilter);
    return list;
  }, [logs, query, actionFilter, areaFilter]);


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

      {/* Counts per area, which is how somebody actually looks for a change:
          "something happened to the ads" rather than "ad_deactivated". */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setAreaFilter('all')}
          className={cn(
            'rounded-xl border p-4 text-left transition-colors',
            areaFilter === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300',
          )}
        >
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className={cn('text-xs mt-0.5', areaFilter === 'all' ? 'text-slate-300' : 'text-slate-500')}>Everything</p>
        </button>
        {ACTIVITY_AREAS.map(area => {
          const count = logs.filter(l => activityArea(l.action) === area).length;
          const on = areaFilter === area;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setAreaFilter(on ? 'all' : area)}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <p className="text-2xl font-bold">{count}</p>
              <p className={cn('text-xs mt-0.5', on ? 'text-slate-300' : 'text-slate-500')}>{area}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by what happened, or who did it…" className="pl-9" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Anything" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anything</SelectItem>
            {Object.keys(ACTIVITY_ACTIONS)
              .filter(a => areaFilter === 'all' || activityArea(a) === areaFilter)
              .map(action => (
                <SelectItem key={action} value={action}>{activityLabel(action)}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        {(areaFilter !== 'all' || actionFilter !== 'all' || query) && (
          <Button variant="ghost" size="sm"
            onClick={() => { setAreaFilter('all'); setActionFilter('all'); setQuery(''); }}>
            Clear filters
          </Button>
        )}
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
                        {iconFor(entry.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const { text, previous } = readPreviousFromLog(entry.description);
                          const open = expanded === entry.id;
                          return (
                            <>
                              <p className="text-sm text-slate-800">{text}</p>
                              {/* An edit that carries what it replaced can be
                                  undone from here. This exists because somebody
                                  rewrote a bio, forgot the original, and had
                                  nowhere to look it up. */}
                              {previous && (
                                <div className="mt-1">
                                  <button
                                    type="button"
                                    onClick={() => setExpanded(open ? null : entry.id)}
                                    className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2"
                                  >
                                    {open ? 'Hide what it was' : 'See what it was before'}
                                  </button>
                                  {open && (
                                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                      <dl className="space-y-2">
                                        {Object.entries(previous)
                                          .filter(([k]) => k !== 'id')
                                          .map(([k, v]) => (
                                            <div key={k}>
                                              <dt className="text-[10px] uppercase tracking-wider text-slate-400">{k}</dt>
                                              <dd className="text-xs text-slate-700 whitespace-pre-wrap break-words">
                                                {v === '' || v === undefined || v === null
                                                  ? <span className="italic text-slate-400">(empty)</span>
                                                  : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                              </dd>
                                            </div>
                                          ))}
                                      </dl>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-3 gap-1.5"
                                        disabled={restoring === entry.id}
                                        onClick={() => handleRestore(entry.id, previous)}
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        {restoring === entry.id ? 'Putting it back…' : 'Put this back'}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.userDisplayName && (
                            <span className="text-xs text-slate-500">{entry.userDisplayName}</span>
                          )}
                          {entry.userDisplayName && <span className="text-slate-300">·</span>}
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {activityLabel(entry.action)}
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
