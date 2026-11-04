/**
 * Readership: recorded on the public site, read on the admin Analytics page.
 *
 * Per visit to a story, the reader's browser records:
 *   - one article_views row when the story opens. Its id carries an anonymous
 *     visitor id — a random number kept in that browser, nothing about who the
 *     reader is — and that is what "unique visitors" counts.
 *   - an article_engagement 'read' row when the reader leaves or switches tab,
 *     saying how long the story was on screen and how far down they got. It can
 *     be sent more than once in one visit (every time the tab is hidden), so
 *     the longest one for each view counts.
 *   - an article_engagement 'share' or 'save' row when they do either.
 *
 * The visitor id rides in the row id because article_views has no column for
 * it, and adding one means a database migration before any of this can work.
 *
 * What this replaced, and why the old numbers were wrong:
 *   - "Unique visitors" counted distinct browser user-agent strings. Every
 *     student on the same model of iPhone shares one, so a whole school could
 *     show up as a handful of visitors.
 *   - A visit was written as an opening row and a leaving row, and the story
 *     loading in two steps (headline first, then the body) started a second
 *     visit, so one read could count as several views.
 *   - The leaving row sent fractional seconds into an integer column, which the
 *     database rejects, so reading time and bounce rate were most likely never
 *     recorded at all — every visit looked like a bounce.
 *   - Shares and saves were never recorded anywhere.
 *   - Only the newest 1,000 rows were ever read: Supabase caps every request
 *     at 1,000 rows, whatever .limit() asks for.
 * Rows from before this change are still counted as views, with the repeats
 * folded together, but they cannot say who read them, so unique visitors only
 * count from the first visit recorded the new way (getUniqueVisitorsSince).
 */

import { getAdminArticlesList } from './adminDataService';
import { getAllPublicArticles } from './publicDataService';
import { storyAuthors } from './coAuthors';
import { sections } from '@/data/seedData';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleEngagement {
  articleId: string;
  views: number;
  uniqueViews: number;
  avgDuration: number;      // Average seconds on screen, over visits that reported it
  avgScrollDepth: number;   // Average percentage scrolled
  bounceRate: number;       // Percentage of measured visits that left within 10 seconds
  shares: number;
  saves: number;
}

export interface AuthorPerformance {
  authorId: string;
  authorName: string;
  totalArticles: number;
  totalViews: number;
  avgViewsPerArticle: number;
  topArticles: Array<{ id: string; headline: string; views: number }>;
}

export interface SectionPerformance {
  section: string;
  name: string;
  totalArticles: number;
  totalViews: number;
  avgViewsPerArticle: number;
  trendingArticles: Array<{ id: string; headline: string; views: number }>;
}

export interface TimeSeriesData {
  date: string;  // YYYY-MM-DD, Sacramento's day rather than UTC's
  views: number;
  articles: number;
  uniqueVisitors: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  totalArticles: number;
  avgViewsPerArticle: number;
  avgReadSeconds: number;
  readsMeasured: number;
  viewsToday: number;
  viewsThisWeek: number;
  /** Change against the period of the same length just before; null when there is nothing to compare. */
  growthRate: number | null;
}

/** How far back to look: a number of days including today, or null for all time. */
export type AnalyticsRange = number | null;

// ─── Recording ────────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const VISITOR_KEY = 'octagon_visitor_id';
const PRIVACY_NO_TRACK_KEY = 'octagon_privacy_no_track';
const MAX_READ_SECONDS = 60 * 60;
const BOUNCE_SECONDS = 10;
// Search engines and link previews run the page's JavaScript too.
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|lighthouse|headless|pingdom|uptime/i;

function trackingOff(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (localStorage.getItem(PRIVACY_NO_TRACK_KEY) === '1') return true;
  } catch { /* storage blocked — still fine to count the visit */ }
  return navigator.webdriver === true || BOT_UA.test(navigator.userAgent);
}

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** This browser's anonymous visitor id: random, made once, kept in localStorage. */
function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id || !/^[0-9a-f]{16}$/.test(id)) {
      id = randomHex(8);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked: this visit still counts, just not towards unique visitors over time.
    return randomHex(8);
  }
}

const rowId = () => `${Date.now().toString(36)}${randomHex(4)}`;

/** The visitor in an article_views row id, or null for rows from before visitor ids. */
export function visitorFromViewId(id: string): string | null {
  const m = /^v1_([0-9a-f]{16})_/.exec(id);
  return m ? m[1] : null;
}

/**
 * Insert one row without waiting, and without the reader ever seeing a failure.
 *
 * Plain fetch rather than the Supabase client so the request can be marked
 * keepalive: the 'read' row is usually sent as the tab closes, and an ordinary
 * request is cancelled along with the page.
 */
function insertRow(
  table: 'article_views' | 'article_engagement',
  row: Record<string, unknown>,
  keepalive = false,
): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    void fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`, {
      method: 'POST',
      keepalive,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    }).catch(() => { /* offline or blocked */ });
  } catch { /* no fetch */ }
}

function scrollPercent(): number {
  const height = document.documentElement.scrollHeight;
  if (!height) return 0;
  return Math.min(100, Math.round(((window.scrollY + window.innerHeight) / height) * 100));
}

/**
 * Record a visit to a story. Call it when the story opens, and call what it
 * returns when the reader leaves.
 */
export function startArticleVisit(articleId: string, slug: string): () => void {
  if (trackingOff()) return () => {};

  const visitor = visitorId();
  const viewId = `v1_${visitor}_${rowId()}`;
  insertRow('article_views', {
    id: viewId,
    article_id: articleId,
    slug,
    timestamp: new Date().toISOString(),
    referrer: document.referrer || 'direct',
    user_agent: navigator.userAgent,
  });

  // Time counts only while the story is on screen, so a tab left open in the
  // background all afternoon does not read as an afternoon of reading.
  let visibleMs = 0;
  let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;
  // Measured as the reader scrolls and as the tab is hidden — never on opening,
  // when the body may not have arrived and the page is short enough to look
  // read to the end, and never on leaving within the site, by which time the
  // next page has replaced this one.
  let maxScroll = 0;
  let lastSent = '';

  const pause = () => {
    if (visibleSince !== null) {
      visibleMs += Date.now() - visibleSince;
      visibleSince = null;
    }
  };
  const send = (keepalive: boolean) => {
    const seconds = Math.min(MAX_READ_SECONDS, Math.round(visibleMs / 1000));
    const key = `${seconds}:${maxScroll}`;
    if (key === lastSent) return;
    lastSent = key;
    insertRow('article_engagement', {
      id: rowId(),
      article_id: articleId,
      type: 'read',
      timestamp: new Date().toISOString(),
      data: { view: viewId, visitor, seconds, scroll: maxScroll },
    }, keepalive);
  };
  const leaveTab = () => {
    pause();
    maxScroll = Math.max(maxScroll, scrollPercent());
    send(true);
  };
  const onScroll = () => { maxScroll = Math.max(maxScroll, scrollPercent()); };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') leaveTab();
    else if (visibleSince === null) visibleSince = Date.now();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', leaveTab);
  return () => {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', leaveTab);
    pause();
    send(false);
  };
}

/** A reader shared or saved a story. */
export function trackArticleEngagement(
  articleId: string,
  type: 'share' | 'save',
  detail?: Record<string, unknown>,
): void {
  if (trackingOff()) return;
  insertRow('article_engagement', {
    id: rowId(),
    article_id: articleId,
    type,
    timestamp: new Date().toISOString(),
    data: { visitor: visitorId(), ...detail },
  });
}

// ─── Loading what was recorded ────────────────────────────────────────────────

interface Visit { articleId: string; at: number; visitor: string | null }
interface Read { articleId: string; at: number; seconds: number; scroll: number }
interface Action { articleId: string; at: number; type: 'share' | 'save' }

let visits: Visit[] = [];
let reads: Read[] = [];
let actions: Action[] = [];
let loadedFromServer = false;

const PAGE_SIZE = 1000;          // Supabase's own cap per request
const MAX_ROWS = 250_000;
// Old-style rows for the same story from the same browser this close together
// are one visit that the two-step load recorded twice.
const LEGACY_REPEAT_MS = 30_000;
// Old-style "leaving" rows this short are that same two-step load, not a reader.
const LEGACY_MIN_SECONDS = 2;

type Row = Record<string, unknown>;
type RowQuery = {
  select: (columns: string) => RowQuery;
  order: (column: string, options: { ascending: boolean }) => RowQuery;
  range: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>;
};

async function fetchAll(from: (table: string) => RowQuery, table: string, columns: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let start = 0; start < MAX_ROWS; start += PAGE_SIZE) {
    const { data, error } = await from(table)
      .select(columns)
      .order('timestamp', { ascending: true })
      .order('id', { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

const seconds = (n: unknown) => Math.max(0, Math.min(MAX_READ_SECONDS, Number(n) || 0));
const percent = (n: unknown) => Math.max(0, Math.min(100, Number(n) || 0));

function ingest(viewRows: Row[], engagementRows: Row[]): void {
  const v: Visit[] = [];
  const r: Read[] = [];
  const a: Action[] = [];

  const lastLegacyOpen = new Map<string, number>();
  for (const row of viewRows) {
    const at = Date.parse(String(row.timestamp ?? ''));
    const ua = String(row.user_agent ?? '');
    if (!Number.isFinite(at) || BOT_UA.test(ua)) continue;
    const articleId = String(row.article_id ?? '');

    const visitor = visitorFromViewId(String(row.id ?? ''));
    if (visitor) {
      v.push({ articleId, at, visitor });
      continue;
    }
    if (row.duration != null) {
      if (seconds(row.duration) >= LEGACY_MIN_SECONDS) {
        r.push({ articleId, at, seconds: seconds(row.duration), scroll: percent(row.scroll_depth) });
      }
      continue;
    }
    const key = `${articleId}|${ua}`;
    const previous = lastLegacyOpen.get(key);
    lastLegacyOpen.set(key, at);
    if (previous !== undefined && at - previous < LEGACY_REPEAT_MS) continue;
    v.push({ articleId, at, visitor: null });
  }

  const longestRead = new Map<string, Read>();
  for (const row of engagementRows) {
    const at = Date.parse(String(row.timestamp ?? ''));
    if (!Number.isFinite(at)) continue;
    const articleId = String(row.article_id ?? '');
    const type = String(row.type ?? '');
    const data = (row.data && typeof row.data === 'object' ? row.data : {}) as Row;

    if (type === 'read') {
      const read = { articleId, at, seconds: seconds(data.seconds), scroll: percent(data.scroll) };
      const view = typeof data.view === 'string' ? data.view : null;
      if (!view) { r.push(read); continue; }
      const earlier = longestRead.get(view);
      longestRead.set(view, earlier
        ? { ...earlier, seconds: Math.max(earlier.seconds, read.seconds), scroll: Math.max(earlier.scroll, read.scroll) }
        : read);
    } else if (type === 'share' || type === 'save') {
      a.push({ articleId, at, type });
    }
  }
  r.push(...longestRead.values());

  visits = v;
  reads = r;
  actions = a;
}

/**
 * Load every recorded visit, read, share and save from the server. Call it
 * before rendering anything that shows numbers; staff can read these tables,
 * readers cannot.
 */
export async function loadServerAnalytics(): Promise<boolean> {
  try {
    const { supabase } = await import('./supabaseClient');
    if (!supabase) return false;
    const from = (table: string) => supabase.from(table as never) as unknown as RowQuery;
    const [viewRows, engagementRows] = await Promise.all([
      fetchAll(from, 'article_views', 'id, article_id, timestamp, duration, scroll_depth, user_agent'),
      fetchAll(from, 'article_engagement', 'id, article_id, type, timestamp, data'),
    ]);
    ingest(viewRows, engagementRows);
    loadedFromServer = true;
    return true;
  } catch {
    return false;
  }
}

/** Whether the numbers on screen came from the server. */
export function isShowingServerAnalytics(): boolean {
  return loadedFromServer;
}

/** When the first visit with a visitor id was recorded — unique visitors count from then. */
export function getUniqueVisitorsSince(): Date | null {
  const first = visits.find((v) => v.visitor);
  return first ? new Date(first.at) : null;
}

// ─── Reading the numbers ──────────────────────────────────────────────────────

/** Local midnight `daysBack` days before `t`. */
function startOfDay(t: number, daysBack = 0): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysBack);
  return d.getTime();
}

/** The local calendar day, so "today" turns over at midnight here, not at 4 or 5pm. */
function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function since(days: AnalyticsRange): number {
  return days == null ? -Infinity : startOfDay(Date.now(), days - 1);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

interface Story { id: string; headline: string; section: string; published: boolean; writers: Array<{ id: string; name: string }> }

/** Every story once — the public list and the admin list overlap, and used to be counted twice. */
function stories(): Map<string, Story> {
  const map = new Map<string, Story>();
  for (const a of getAllPublicArticles()) {
    map.set(String(a.id), {
      id: String(a.id),
      headline: a.headline,
      section: a.section,
      published: true,
      writers: storyAuthors(a).map((w) => ({ id: w.id, name: w.name })),
    });
  }
  for (const a of getAdminArticlesList()) {
    if (map.has(a.id)) continue;
    map.set(a.id, {
      id: a.id,
      headline: a.headline,
      section: a.section,
      published: false,
      writers: [{ id: a.author.id, name: a.author.name }],
    });
  }
  return map;
}

function articleStats(days: AnalyticsRange): Map<string, ArticleEngagement> {
  const from = since(days);
  const acc = new Map<string, { views: number; visitors: Set<string>; seconds: number[]; scrolls: number[]; shares: number; saves: number }>();
  const entry = (id: string) => {
    let e = acc.get(id);
    if (!e) {
      e = { views: 0, visitors: new Set(), seconds: [], scrolls: [], shares: 0, saves: 0 };
      acc.set(id, e);
    }
    return e;
  };
  for (const v of visits) {
    if (v.at < from) continue;
    const e = entry(v.articleId);
    e.views++;
    if (v.visitor) e.visitors.add(v.visitor);
  }
  for (const r of reads) {
    if (r.at < from) continue;
    const e = entry(r.articleId);
    e.seconds.push(r.seconds);
    e.scrolls.push(r.scroll);
  }
  for (const a of actions) {
    if (a.at < from) continue;
    const e = entry(a.articleId);
    if (a.type === 'share') e.shares++;
    else e.saves++;
  }

  const result = new Map<string, ArticleEngagement>();
  acc.forEach((e, articleId) => {
    result.set(articleId, {
      articleId,
      views: e.views,
      uniqueViews: e.visitors.size,
      avgDuration: mean(e.seconds),
      avgScrollDepth: mean(e.scrolls),
      bounceRate: e.seconds.length ? (e.seconds.filter((s) => s < BOUNCE_SECONDS).length / e.seconds.length) * 100 : 0,
      shares: e.shares,
      saves: e.saves,
    });
  });
  return result;
}

export function getAnalyticsSummary(days: AnalyticsRange): AnalyticsSummary {
  const now = Date.now();
  const from = since(days);
  const current = visits.filter((v) => v.at >= from);

  let growthRate: number | null = null;
  if (days != null) {
    const previousFrom = startOfDay(now, days * 2 - 1);
    const previous = visits.filter((v) => v.at >= previousFrom && v.at < from).length;
    if (previous > 0) growthRate = ((current.length - previous) / previous) * 100;
  }

  const measured = reads.filter((r) => r.at >= from);
  const totalArticles = Array.from(stories().values()).filter((s) => s.published).length;
  const today = startOfDay(now);
  const weekAgo = startOfDay(now, 6);

  return {
    totalViews: current.length,
    uniqueVisitors: new Set(current.filter((v) => v.visitor).map((v) => v.visitor)).size,
    totalArticles,
    avgViewsPerArticle: totalArticles > 0 ? current.length / totalArticles : 0,
    avgReadSeconds: mean(measured.map((r) => r.seconds)),
    readsMeasured: measured.length,
    viewsToday: visits.filter((v) => v.at >= today).length,
    viewsThisWeek: visits.filter((v) => v.at >= weekAgo).length,
    growthRate,
  };
}

export function getTopArticles(
  limit: number,
  days: AnalyticsRange,
): Array<{ id: string; headline: string; views: number; engagement: ArticleEngagement }> {
  const all = stories();
  return Array.from(articleStats(days).values())
    .filter((e) => e.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
    .map((e) => ({
      id: e.articleId,
      headline: all.get(e.articleId)?.headline ?? 'A story no longer on the site',
      views: e.views,
      engagement: e,
    }));
}

/** Every writer's stories and views. A story written together counts in full for each of its writers. */
export function getAllAuthorsPerformance(days: AnalyticsRange): AuthorPerformance[] {
  const stats = articleStats(days);
  const byAuthor = new Map<string, AuthorPerformance>();
  stories().forEach((story) => {
    if (!story.published) return;
    const views = stats.get(story.id)?.views ?? 0;
    for (const w of story.writers) {
      if (!w.id) continue;
      const p = byAuthor.get(w.id) ?? {
        authorId: w.id, authorName: w.name, totalArticles: 0, totalViews: 0, avgViewsPerArticle: 0, topArticles: [],
      };
      p.totalArticles++;
      p.totalViews += views;
      if (views > 0) p.topArticles.push({ id: story.id, headline: story.headline, views });
      byAuthor.set(w.id, p);
    }
  });
  return Array.from(byAuthor.values())
    .map((p) => ({
      ...p,
      avgViewsPerArticle: p.totalArticles ? p.totalViews / p.totalArticles : 0,
      topArticles: p.topArticles.sort((a, b) => b.views - a.views).slice(0, 5),
    }))
    .sort((a, b) => b.totalViews - a.totalViews || b.totalArticles - a.totalArticles);
}

/** The paper's real sections — this used to be a hand-typed list that had lost Features. */
export function getAllSectionsPerformance(days: AnalyticsRange): SectionPerformance[] {
  const stats = articleStats(days);
  const all = Array.from(stories().values()).filter((s) => s.published);
  return sections.map((section) => {
    const inSection = all.filter((s) => s.section === section.slug);
    const ranked = inSection
      .map((s) => ({ id: s.id, headline: s.headline, views: stats.get(s.id)?.views ?? 0 }))
      .sort((a, b) => b.views - a.views);
    const totalViews = ranked.reduce((sum, s) => sum + s.views, 0);
    return {
      section: section.slug,
      name: section.name,
      totalArticles: inSection.length,
      totalViews,
      avgViewsPerArticle: inSection.length ? totalViews / inSection.length : 0,
      trendingArticles: ranked.filter((s) => s.views > 0).slice(0, 5),
    };
  });
}

/** Views per day. For all time, from the first recorded visit, up to a year. */
export function getTimeSeriesData(days: AnalyticsRange): TimeSeriesData[] {
  const now = Date.now();
  let span = days ?? 30;
  if (days == null && visits.length) {
    span = Math.round((startOfDay(now) - startOfDay(visits[0].at)) / 86_400_000) + 1;
  }
  span = Math.max(1, Math.min(365, span));

  const buckets = new Map<string, { views: number; articles: Set<string>; visitors: Set<string> }>();
  for (let i = span - 1; i >= 0; i--) {
    buckets.set(dayKey(startOfDay(now, i)), { views: 0, articles: new Set(), visitors: new Set() });
  }
  for (const v of visits) {
    const bucket = buckets.get(dayKey(v.at));
    if (!bucket) continue;
    bucket.views++;
    bucket.articles.add(v.articleId);
    if (v.visitor) bucket.visitors.add(v.visitor);
  }
  return Array.from(buckets.entries()).map(([date, b]) => ({
    date,
    views: b.views,
    articles: b.articles.size,
    uniqueVisitors: b.visitors.size,
  }));
}
