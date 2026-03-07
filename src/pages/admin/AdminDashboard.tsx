import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Users, TrendingUp, Clock, PenSquare, BarChart3,
  AlertTriangle, CheckCircle2, Activity, Flame, Eye, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getAdminArticlesList, getAdminAuthorsList, getAdminStats,
  type AdminArticle, type AdminAuthor,
  WORKFLOW_LABELS, WORKFLOW_COLORS,
} from '@/lib/adminDataService';
import { getActivityLog } from '@/lib/adminUserService';
import { articles as jsonArticles, authors as jsonAuthors } from '@/data/seedData';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { cn } from '@/lib/utils';

const SECTION_NAMES: Record<string, string> = {
  us: 'News', arts: 'Arts & Ent.', opinion: 'Opinion',
  editorial: 'Editorial', sports: 'Sports',
};

function mergeAllArticles(): AdminArticle[] {
  const map = new Map<string, AdminArticle>();
  jsonArticles.forEach((a) => {
    map.set(String(a.id), {
      id: String(a.id), slug: a.slug, headline: a.headline, dek: a.dek,
      body: a.body, image: a.image, images: a.images ?? [],
      imageCaption: a.imageCaption, section: a.section, author: { ...a.author },
      publishedAt: a.publishedAt.toISOString(), updatedAt: a.updatedAt?.toISOString(),
      readingTime: a.readingTime, tags: a.tags, status: 'published', priority: 'normal',
    });
  });
  getAdminArticlesList().forEach((a) => map.set(a.id, a));
  return Array.from(map.values());
}

function mergeAllAuthors(): AdminAuthor[] {
  const map = new Map<string, AdminAuthor>();
  jsonAuthors.forEach((a) => map.set(a.id, {
    id: a.id, name: a.name, role: a.role, bio: a.bio,
    image: a.image, email: a.email, twitter: a.twitter,
  }));
  getAdminAuthorsList().forEach((a) => map.set(a.id, a));
  return Array.from(map.values());
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function AdminDashboard() {
  const { currentUser } = useAdminAuth();
  const allArticles  = useMemo(mergeAllArticles, []);
  const allAuthors   = useMemo(mergeAllAuthors, []);
  const stats        = useMemo(() => getAdminStats(allArticles, allAuthors), [allArticles, allAuthors]);
  const activityLog  = useMemo(() => getActivityLog().slice(0, 12), []);

  const recentArticles = useMemo(() =>
    [...allArticles]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 8),
    [allArticles]
  );

  const overdueArticles = useMemo(() =>
    allArticles.filter(a =>
      a.deadline &&
      new Date(a.deadline) < new Date() &&
      !['published', 'archived'].includes(a.status)
    ).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()),
    [allArticles]
  );

  const inQueueArticles = useMemo(() =>
    allArticles.filter(a => ['submitted', 'in_review', 'approved'].includes(a.status)),
    [allArticles]
  );

  const breakingArticles = useMemo(() =>
    allArticles.filter(a => a.priority === 'breaking' && a.status !== 'archived'),
    [allArticles]
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}{currentUser ? `, ${currentUser.displayName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link to="/admin/stories/new">
          <Button className="gap-2"><PenSquare className="h-4 w-4" />New Story</Button>
        </Link>
      </div>

      {/* Breaking News Alert */}
      {breakingArticles.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <Flame className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Breaking Stories Active</p>
            {breakingArticles.slice(0, 2).map(a => (
              <Link key={a.id} to={`/admin/stories/edit/${a.id}`}
                className="block text-xs text-red-600 hover:underline mt-0.5 truncate max-w-lg">
                → {a.headline}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Alert */}
      {overdueArticles.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">
              {overdueArticles.length} overdue deadline{overdueArticles.length > 1 ? 's' : ''}
            </p>
            {overdueArticles.slice(0, 2).map(a => (
              <Link key={a.id} to={`/admin/stories/edit/${a.id}`}
                className="block text-xs text-amber-600 hover:underline mt-0.5 truncate max-w-lg">
                → {a.headline} — due {new Date(a.deadline!).toLocaleDateString()}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Stories',  value: stats.totalArticles,   icon: FileText,      color: 'text-slate-400' },
          { label: 'Published',      value: stats.publishedArticles,icon: TrendingUp,    color: 'text-green-500' },
          { label: 'In Review Queue',value: stats.inReviewCount + stats.submittedCount + stats.approvedCount, icon: Eye, color: 'text-violet-500' },
          { label: 'Authors',        value: stats.totalAuthors,    icon: Users,         color: 'text-blue-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <Icon className={cn('h-4 w-4', color)} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Pitches',    value: stats.pitchCount,      color: 'bg-slate-100 text-slate-700' },
          { label: 'Drafts',     value: stats.draftArticles,   color: 'bg-amber-100 text-amber-700' },
          { label: 'Submitted',  value: stats.submittedCount,  color: 'bg-orange-100 text-orange-700' },
          { label: 'Overdue',    value: stats.overdueCount,    color: 'bg-red-100 text-red-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('rounded-xl p-4', color)}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Stories */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Stories</CardTitle>
              <Link to="/admin/stories" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                View all →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {recentArticles.map((article) => (
                  <Link key={article.id} to={`/admin/stories/edit/${article.id}`}
                    className="flex items-start gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {article.priority === 'breaking' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Breaking</span>
                        )}
                        {article.priority === 'high' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">High</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">{article.headline}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{article.author.name}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{SECTION_NAMES[article.section] ?? article.section}</span>
                        {article.deadline && new Date(article.deadline) < new Date() && !['published','archived'].includes(article.status) && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-red-500 font-medium">Overdue</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0',
                      WORKFLOW_COLORS[article.status]
                    )}>
                      {WORKFLOW_LABELS[article.status]}
                    </span>
                  </Link>
                ))}
                {recentArticles.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-400">No stories yet. Create your first one!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review Queue */}
          {inQueueArticles.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Review Queue</CardTitle>
                  <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                    {inQueueArticles.length}
                  </span>
                </div>
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {inQueueArticles.slice(0, 5).map(article => (
                    <Link key={article.id} to={`/admin/stories/edit/${article.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{article.headline}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{article.assignedToName ?? article.author.name}</p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0',
                        WORKFLOW_COLORS[article.status]
                      )}>
                        {WORKFLOW_LABELS[article.status]}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Section Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">By Section</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(SECTION_NAMES).map(([slug, name]) => {
                  const count = stats.articlesBySection[slug] || 0;
                  const pct   = stats.totalArticles > 0 ? (count / stats.totalArticles) * 100 : 0;
                  return (
                    <div key={slug}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600 font-medium text-xs">{name}</span>
                        <span className="text-slate-400 text-xs">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-700 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {activityLog.length > 0 ? activityLog.map(log => (
                  <div key={log.id} className="px-5 py-2.5">
                    <p className="text-xs text-slate-700 leading-snug">{log.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(log.timestamp)}</p>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-xs text-slate-400">No activity yet.</p>
                  </div>
                )}
              </div>
              {activityLog.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100">
                  <Link to="/admin/activity" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
                    View full log →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Link to="/admin/stories/new" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <PenSquare className="h-4 w-4" />Write New Story
                </Button>
              </Link>
              <Link to="/admin/stories?status=submitted" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Eye className="h-4 w-4" />Review Submissions
                </Button>
              </Link>
              <Link to="/admin/users" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />Manage Staff
                </Button>
              </Link>
              <Link to="/" target="_blank" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ExternalLink className="h-4 w-4" />View Live Site
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
