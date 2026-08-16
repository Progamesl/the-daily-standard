/**
 * Advanced Analytics Service
 * Comprehensive tracking for article views, engagement, author performance, and trends.
 * Privacy-safe: respects user opt-out preferences.
 */

import { getAdminArticlesList, type AdminArticle } from './adminDataService';
import { getAllPublicArticles } from './publicDataService';
import type { Article } from '@/data/seedData';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const ANALYTICS_KEY = 'octagon_analytics_v2';
const VIEWS_KEY = 'octagon_article_views_v2';
const ENGAGEMENT_KEY = 'octagon_engagement_v2';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ArticleView {
  articleId: string;
  slug: string;
  timestamp: string;
  duration?: number;        // Time spent reading (seconds)
  scrollDepth?: number;     // Percentage scrolled (0-100)
  referrer?: string;        // Where they came from
  userAgent?: string;       // Browser/device info
}

export interface ArticleEngagement {
  articleId: string;
  views: number;
  uniqueViews: number;
  avgDuration: number;      // Average reading time in seconds
  avgScrollDepth: number;   // Average scroll percentage
  bounceRate: number;       // Percentage who left immediately
  shares: number;
  saves: number;
}

export interface AuthorPerformance {
  authorId: string;
  authorName: string;
  totalArticles: number;
  totalViews: number;
  avgViewsPerArticle: number;
  totalEngagement: number;
  topArticles: Array<{ id: string; headline: string; views: number }>;
}

export interface SectionPerformance {
  section: string;
  totalArticles: number;
  totalViews: number;
  avgViewsPerArticle: number;
  trendingArticles: Array<{ id: string; headline: string; views: number }>;
}

export interface TimeSeriesData {
  date: string;  // YYYY-MM-DD
  views: number;
  articles: number;
  uniqueVisitors: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalArticles: number;
  avgViewsPerArticle: number;
  topArticle: { id: string; headline: string; views: number } | null;
  topAuthor: { id: string; name: string; views: number } | null;
  topSection: { section: string; views: number } | null;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  growthRate: number;  // Percentage change vs previous period
}

// ─── View Tracking ────────────────────────────────────────────────────────────
//
// Readership is recorded on the server. It used to be written to localStorage
// and read back from localStorage — but the writing happened in the READER's
// browser and the reading happened in an EDITOR's, two different computers in
// every real case. So the analytics page could only ever show whatever the
// person looking at it had personally read, and always looked like the paper
// had almost no readers. The article_views and article_engagement tables were
// there the whole time, empty.
//
// The reader's own copy is still kept: it costs nothing, it survives a dropped
// connection, and it is what the reading-history features use.

/** Fire-and-forget insert. A reader must never wait on, or see, our bookkeeping. */
function recordOnServer(table: 'article_views' | 'article_engagement', row: Record<string, unknown>): void {
  void (async () => {
    try {
      const { supabase } = await import('./supabaseClient');
      if (!supabase) return;
      await supabase.from(table).insert({
        id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
        ...row,
      } as never);
    } catch {
      // Offline or blocked. The local copy below still has it.
    }
  })();
}

export function trackArticleView(
  articleId: string,
  slug: string,
  options?: {
    duration?: number;
    scrollDepth?: number;
    referrer?: string;
  }
): void {
  if (typeof window === 'undefined') return;

  // Check privacy opt-out
  if (localStorage.getItem('octagon_privacy_no_track') === '1') return;

  const timestamp = new Date().toISOString();
  const referrer = options?.referrer || document.referrer || 'direct';

  recordOnServer('article_views', {
    article_id: articleId,
    slug,
    timestamp,
    duration: options?.duration ?? null,
    scroll_depth: options?.scrollDepth ?? null,
    referrer,
    user_agent: navigator.userAgent,
  });

  try {
    const views: ArticleView[] = JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]');
    views.push({
      articleId,
      slug,
      timestamp,
      duration: options?.duration,
      scrollDepth: options?.scrollDepth,
      referrer,
      userAgent: navigator.userAgent,
    });

    // Keep last 10,000 views
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views.slice(-10000)));
    // Clear cache to force refresh
    viewsCache = null;
    engagementMapCache = null;
  } catch {
    // Non-fatal
  }
}

export function trackArticleEngagement(
  articleId: string,
  type: 'share' | 'save' | 'scroll' | 'read',
  data?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('octagon_privacy_no_track') === '1') return;

  const timestamp = new Date().toISOString();
  recordOnServer('article_engagement', {
    article_id: articleId,
    type,
    timestamp,
    data: data ?? {},
  });

  try {
    const engagement: Array<{
      articleId: string;
      type: string;
      timestamp: string;
      data?: Record<string, unknown>;
    }> = JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) || '[]');

    engagement.push({
      articleId,
      type,
      timestamp,
      data,
    });

    localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(engagement.slice(-5000)));
    // Clear cache to force refresh
    engagementCache = null;
    engagementMapCache = null;
  } catch {
    // Non-fatal
  }
}

// ─── Reading the real numbers ─────────────────────────────────────────────────

/**
 * Once this has run, every function below reports the paper's actual
 * readership instead of the current browser's.
 *
 * All the aggregation is synchronous and shared, so rather than making a dozen
 * functions async, this loads the server's rows into the same caches they
 * already read from. Call it before rendering anything that shows numbers.
 */
let usingServerData = false;

export async function loadServerAnalytics(): Promise<boolean> {
  try {
    const { supabase } = await import('./supabaseClient');
    if (!supabase) return false;

    const [viewsRes, engRes] = await Promise.all([
      supabase.from('article_views').select('*').order('timestamp', { ascending: false }).limit(50000),
      supabase.from('article_engagement').select('*').order('timestamp', { ascending: false }).limit(20000),
    ]);
    if (viewsRes.error || engRes.error) return false;

    viewsCache = (viewsRes.data as unknown as Record<string, unknown>[]).map(r => ({
      articleId: String(r.article_id ?? ''),
      slug: String(r.slug ?? ''),
      timestamp: String(r.timestamp ?? ''),
      duration: r.duration == null ? undefined : Number(r.duration),
      scrollDepth: r.scroll_depth == null ? undefined : Number(r.scroll_depth),
      referrer: String(r.referrer ?? 'direct'),
      userAgent: String(r.user_agent ?? ''),
    }));
    engagementCache = (engRes.data as unknown as Record<string, unknown>[]).map(r => ({
      articleId: String(r.article_id ?? ''),
      type: String(r.type ?? ''),
      timestamp: String(r.timestamp ?? ''),
    }));

    // Hold these until the next explicit reload rather than letting the 5s TTL
    // drop us back to this browser's own history mid-render.
    viewsCacheTime = Number.MAX_SAFE_INTEGER;
    engagementCacheTime = Number.MAX_SAFE_INTEGER;
    engagementMapCache = null;
    usingServerData = true;
    return true;
  } catch {
    return false;
  }
}

/** Whether the numbers on screen are the paper's or just this browser's. */
export function isShowingServerAnalytics(): boolean {
  return usingServerData;
}

// ─── Caching for Performance ───────────────────────────────────────────────────
let viewsCache: ArticleView[] | null = null;
let viewsCacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

let engagementCache: Array<{ articleId: string; type: string; timestamp: string }> | null = null;
let engagementCacheTime = 0;

let engagementMapCache: Record<string, ArticleEngagement> | null = null;
let engagementMapCacheTime = 0;

function getViews(): ArticleView[] {
  const now = Date.now();
  if (viewsCache && (now - viewsCacheTime) < CACHE_TTL) {
    return viewsCache;
  }
  try {
    viewsCache = JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]');
    viewsCacheTime = now;
    return viewsCache;
  } catch {
    viewsCache = [];
    viewsCacheTime = now;
    return [];
  }
}

function getEngagement(): Array<{ articleId: string; type: string; timestamp: string }> {
  const now = Date.now();
  if (engagementCache && (now - engagementCacheTime) < CACHE_TTL) {
    return engagementCache;
  }
  try {
    engagementCache = JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) || '[]');
    engagementCacheTime = now;
    return engagementCache;
  } catch {
    engagementCache = [];
    engagementCacheTime = now;
    return [];
  }
}

export function clearAnalyticsCache(): void {
  viewsCache = null;
  viewsCacheTime = 0;
  engagementCache = null;
  engagementCacheTime = 0;
  engagementMapCache = null;
  usingServerData = false;
}

export function getArticleEngagement(articleId: string): ArticleEngagement {
  const views = getViews().filter(v => v.articleId === articleId);
  const engagement = getEngagement().filter(e => e.articleId === articleId);
  
  const uniqueViewers = new Set(views.map(v => v.userAgent || 'unknown')).size;
  const durations = views.filter(v => v.duration).map(v => v.duration!);
  const scrollDepths = views.filter(v => v.scrollDepth).map(v => v.scrollDepth!);
  
  const bounces = views.filter(v => (!v.duration || v.duration < 5) && (!v.scrollDepth || v.scrollDepth < 10)).length;
  
  return {
    articleId,
    views: views.length,
    uniqueViews: uniqueViewers,
    avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    avgScrollDepth: scrollDepths.length > 0 ? scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length : 0,
    bounceRate: views.length > 0 ? (bounces / views.length) * 100 : 0,
    shares: engagement.filter(e => e.type === 'share').length,
    saves: engagement.filter(e => e.type === 'save').length,
  };
}

export function getAllArticlesEngagement(): Record<string, ArticleEngagement> {
  const now = Date.now();
  if (engagementMapCache && (now - engagementMapCacheTime) < CACHE_TTL) {
    return engagementMapCache;
  }
  
  const views = getViews();
  const engagement = getEngagement();
  const articleIds = new Set([...views.map(v => v.articleId), ...engagement.map(e => e.articleId)]);
  
  const result: Record<string, ArticleEngagement> = {};
  articleIds.forEach(id => {
    result[id] = getArticleEngagement(id);
  });
  
  engagementMapCache = result;
  engagementMapCacheTime = now;
  return result;
}

function getAllArticles(): Array<AdminArticle | Article> {
  const adminArticles = getAdminArticlesList();
  const publicArticles = getAllPublicArticles();
  return [...adminArticles, ...publicArticles];
}

export function getAuthorPerformance(authorId: string): AuthorPerformance {
  const allArticles = getAllArticles();
  const authorArticles = allArticles.filter(a => a.author.id === authorId);
  const engagement = getAllArticlesEngagement();
  
  let totalViews = 0;
  const topArticles: Array<{ id: string; headline: string; views: number }> = [];
  
  authorArticles.forEach(article => {
    const eng = engagement[article.id] || { views: 0, uniqueViews: 0, avgDuration: 0, avgScrollDepth: 0, bounceRate: 0, shares: 0, saves: 0 };
    totalViews += eng.views;
    topArticles.push({
      id: article.id,
      headline: article.headline,
      views: eng.views,
    });
  });
  
  topArticles.sort((a, b) => b.views - a.views);
  
  const author = authorArticles[0]?.author;
  
  return {
    authorId,
    authorName: author?.name || 'Unknown',
    totalArticles: authorArticles.length,
    totalViews,
    avgViewsPerArticle: authorArticles.length > 0 ? totalViews / authorArticles.length : 0,
    totalEngagement: totalViews, // Can expand this
    topArticles: topArticles.slice(0, 5),
  };
}

export function getSectionPerformance(section: string): SectionPerformance {
  const allArticles = getAllArticles();
  const sectionArticles = allArticles.filter(a => a.section === section);
  const engagement = getAllArticlesEngagement();
  
  let totalViews = 0;
  const trendingArticles: Array<{ id: string; headline: string; views: number }> = [];
  
  sectionArticles.forEach(article => {
    const eng = engagement[article.id] || { views: 0, uniqueViews: 0, avgDuration: 0, avgScrollDepth: 0, bounceRate: 0, shares: 0, saves: 0 };
    totalViews += eng.views;
    trendingArticles.push({
      id: article.id,
      headline: article.headline,
      views: eng.views,
    });
  });
  
  trendingArticles.sort((a, b) => b.views - a.views);
  
  return {
    section,
    totalArticles: sectionArticles.length,
    totalViews,
    avgViewsPerArticle: sectionArticles.length > 0 ? totalViews / sectionArticles.length : 0,
    trendingArticles: trendingArticles.slice(0, 5),
  };
}

export function getTimeSeriesData(days: number = 30): TimeSeriesData[] {
  const views = getViews();
  const now = new Date();
  const data: Record<string, { views: number; articles: Set<string>; visitors: Set<string> }> = {};
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    data[dateStr] = { views: 0, articles: new Set(), visitors: new Set() };
  }
  
  views.forEach(view => {
    const dateStr = new Date(view.timestamp).toISOString().split('T')[0];
    if (data[dateStr]) {
      data[dateStr].views++;
      data[dateStr].articles.add(view.articleId);
      if (view.userAgent) {
        data[dateStr].visitors.add(view.userAgent);
      }
    }
  });
  
  return Object.entries(data).map(([date, stats]) => ({
    date,
    views: stats.views,
    articles: stats.articles.size,
    uniqueVisitors: stats.visitors.size,
  }));
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const engagement = getAllArticlesEngagement();
  const allArticles = getAllArticles();
  const views = getViews();
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lastMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const viewsToday = views.filter(v => v.timestamp.startsWith(today)).length;
  const viewsThisWeek = views.filter(v => v.timestamp >= weekAgo).length;
  const viewsThisMonth = views.filter(v => v.timestamp >= monthAgo).length;
  const viewsLastMonth = views.filter(v => {
    const ts = v.timestamp;
    return ts >= lastMonthStart && ts < monthAgo;
  }).length;
  
  const totalViews = views.length;
  const totalArticles = allArticles.length;
  
  // Top article
  const articleViews = Object.entries(engagement)
    .map(([id, eng]) => ({ id, headline: allArticles.find(a => a.id === id)?.headline || 'Unknown', views: eng.views }))
    .sort((a, b) => b.views - a.views);
  
  // Top author
  const authorMap = new Map<string, { name: string; views: number }>();
  allArticles.forEach(article => {
    const eng = engagement[article.id] || { views: 0, uniqueViews: 0, avgDuration: 0, avgScrollDepth: 0, bounceRate: 0, shares: 0, saves: 0 };
    const existing = authorMap.get(article.author.id) || { name: article.author.name, views: 0 };
    existing.views += eng.views;
    authorMap.set(article.author.id, existing);
  });
  
  const topAuthor = Array.from(authorMap.entries())
    .sort((a, b) => b[1].views - a[1].views)[0];
  
  // Top section
  const sectionMap = new Map<string, number>();
  allArticles.forEach(article => {
    const eng = engagement[article.id] || { views: 0, uniqueViews: 0, avgDuration: 0, avgScrollDepth: 0, bounceRate: 0, shares: 0, saves: 0 };
    sectionMap.set(article.section, (sectionMap.get(article.section) || 0) + eng.views);
  });
  
  const topSection = Array.from(sectionMap.entries())
    .sort((a, b) => b[1] - a[1])[0];
  
  const growthRate = viewsLastMonth > 0 
    ? ((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100 
    : 0;
  
  return {
    totalViews,
    totalArticles,
    avgViewsPerArticle: totalArticles > 0 ? totalViews / totalArticles : 0,
    topArticle: articleViews[0] || null,
    topAuthor: topAuthor ? { id: topAuthor[0], name: topAuthor[1].name, views: topAuthor[1].views } : null,
    topSection: topSection ? { section: topSection[0], views: topSection[1] } : null,
    viewsToday,
    viewsThisWeek,
    viewsThisMonth,
    growthRate,
  };
}

export function getTopArticles(limit: number = 10): Array<{ id: string; headline: string; views: number; engagement: ArticleEngagement }> {
  const engagement = getAllArticlesEngagement();
  const allArticles = getAllArticles();
  
  return Object.entries(engagement)
    .map(([id, eng]) => ({
      id,
      headline: allArticles.find(a => a.id === id)?.headline || 'Unknown',
      views: eng.views,
      engagement: eng,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export function getAllAuthorsPerformance(): AuthorPerformance[] {
  const allArticles = getAllArticles();
  const authorIds = new Set(allArticles.map(a => a.author.id));
  
  return Array.from(authorIds)
    .map(id => getAuthorPerformance(id))
    .sort((a, b) => b.totalViews - a.totalViews);
}

export function getAllSectionsPerformance(): SectionPerformance[] {
  const sections = ['us', 'arts', 'opinion', 'editorial', 'sports'];
  return sections.map(s => getSectionPerformance(s));
}
