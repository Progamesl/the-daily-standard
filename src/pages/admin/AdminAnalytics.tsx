/**
 * Advanced Analytics Dashboard
 * Comprehensive analytics with real-time metrics, charts, and insights.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Eye, Users, Clock, Share2, Bookmark,
  ArrowUpRight, ArrowDownRight, FileText, Award, Target,
  Calendar, User, FolderOpen, Flame, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  getAnalyticsSummary,
  getTopArticles,
  getAllAuthorsPerformance,
  getAllSectionsPerformance,
  getTimeSeriesData,
  loadServerAnalytics,
  isShowingServerAnalytics,
  type ArticleEngagement,
} from '@/lib/analyticsService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'authors' | 'sections'>('overview');

  // These numbers used to come out of whatever the person looking at this page
  // had personally read, because readership was recorded in each reader's own
  // browser and read back from the editor's. The figures are pulled from the
  // server first now; everything below aggregates the same way, over real rows.
  const [loading, setLoading] = useState(true);
  const [fromServer, setFromServer] = useState(false);
  const [dataKey, setDataKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadServerAnalytics()
      .then(ok => {
        if (cancelled) return;
        setFromServer(ok && isShowingServerAnalytics());
        setDataKey(k => k + 1);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const summary = useMemo(() => getAnalyticsSummary(), [dataKey]);
  const topArticles = useMemo(() => getTopArticles(10), [dataKey]);
  const authorsPerformance = useMemo(() => getAllAuthorsPerformance(), [dataKey]);
  const sectionsPerformance = useMemo(() => getAllSectionsPerformance(), [dataKey]);
  const timeSeries = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    return getTimeSeriesData(days);
  }, [timeRange, dataKey]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            {loading ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Loading the paper&rsquo;s readership…</>
            ) : fromServer ? (
              <>What readers are actually reading, across the whole site.</>
            ) : (
              <><AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Could not reach the server, so these are only this browser&rsquo;s figures.</>
            )}
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v: '7d' | '30d' | '90d' | 'all') => setTimeRange(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Views</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{formatNumber(summary.totalViews)}</p>
                <div className="flex items-center gap-1 mt-2">
                  {summary.growthRate >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    summary.growthRate >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {Math.abs(summary.growthRate).toFixed(1)}% vs last period
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Views Today</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{summary.viewsToday}</p>
                <p className="text-xs text-slate-400 mt-2">{summary.viewsThisWeek} this week</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Articles</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{summary.totalArticles}</p>
                <p className="text-xs text-slate-400 mt-2">{summary.avgViewsPerArticle.toFixed(1)} avg views</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Engagement</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {topArticles.length > 0
                    ? formatDuration(topArticles.reduce((sum, a) => sum + a.engagement.avgDuration, 0) / topArticles.length)
                    : '0s'}
                </p>
                <p className="text-xs text-slate-400 mt-2">Average reading time</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {(['overview', 'articles', 'authors', 'sections'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Time Series Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Views Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} name="Views" />
                  <Line type="monotone" dataKey="uniqueVisitors" stroke="#8b5cf6" strokeWidth={2} name="Unique Visitors" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Articles & Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5" />
                  Top Articles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topArticles.slice(0, 5).map((article, idx) => (
                    <div key={article.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0",
                        idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-600" : "bg-slate-300"
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/admin/stories/edit/${article.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 line-clamp-2"
                        >
                          {article.headline}
                        </Link>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(article.views)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(article.engagement.avgDuration)}
                          </span>
                          <span>{article.engagement.bounceRate.toFixed(0)}% bounce</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Section Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={sectionsPerformance.map(s => ({ name: s.section, value: s.totalViews }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sectionsPerformance.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <Card>
          <CardHeader>
            <CardTitle>Article Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Headline</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Views</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Unique</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Avg Time</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Scroll</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Bounce</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {topArticles.map((article, idx) => (
                    <tr key={article.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold text-white",
                          idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-600" : "bg-slate-300"
                        )}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/admin/stories/edit/${article.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1"
                        >
                          {article.headline}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatNumber(article.views)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNumber(article.engagement.uniqueViews)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatDuration(article.engagement.avgDuration)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{article.engagement.avgScrollDepth.toFixed(0)}%</td>
                      <td className="py-3 px-4 text-right text-slate-600">{article.engagement.bounceRate.toFixed(0)}%</td>
                      <td className="py-3 px-4 text-right text-slate-600">{article.engagement.shares}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Authors Tab */}
      {activeTab === 'authors' && (
        <Card>
          <CardHeader>
            <CardTitle>Author Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {authorsPerformance.slice(0, 10).map((author, idx) => (
                <div key={author.authorId} className="flex items-center justify-between p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                      idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-600" : "bg-slate-300"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{author.authorName}</p>
                      <p className="text-sm text-slate-500">{author.totalArticles} articles</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{formatNumber(author.totalViews)}</p>
                      <p className="text-xs text-slate-500">Total views</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{formatNumber(author.avgViewsPerArticle)}</p>
                      <p className="text-xs text-slate-500">Avg per article</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sectionsPerformance.map((section) => (
            <Card key={section.section}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  {section.section.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{formatNumber(section.totalViews)}</p>
                    <p className="text-sm text-slate-500">Total views</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{section.totalArticles}</p>
                    <p className="text-sm text-slate-500">Articles</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{formatNumber(section.avgViewsPerArticle)}</p>
                    <p className="text-sm text-slate-500">Avg views per article</p>
                  </div>
                  {section.trendingArticles.length > 0 && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Top Articles</p>
                      <div className="space-y-2">
                        {section.trendingArticles.map(article => (
                          <Link
                            key={article.id}
                            to={`/admin/stories/edit/${article.id}`}
                            className="block text-sm text-slate-600 hover:text-blue-600 line-clamp-1"
                          >
                            {article.headline}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
