import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// A stand-in for Supabase that, like the real thing, hands back at most
// 1,000 rows per request however many are asked for.
const tables: Record<string, Record<string, unknown>[]> = {};
vi.mock("@/lib/supabaseClient", () => {
  const from = (table: string) => {
    const query = {
      select: () => query,
      order: () => query,
      range: async (start: number, end: number) => ({
        data: (tables[table] ?? []).slice(start, Math.min(end + 1, start + 1000)),
        error: null,
      }),
    };
    return query;
  };
  return { supabase: { from }, isSupabaseConfigured: () => true, getSupabaseClient: () => ({ from }) };
});

const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const visitor = (n: number) => n.toString(16).padStart(16, "0");
const view = (who: number, article: string, when = ago(60_000), ua = "iPhone Safari") => ({
  id: `v1_${visitor(who)}_${Math.random().toString(36).slice(2)}`,
  article_id: article,
  timestamp: when,
  duration: null,
  scroll_depth: null,
  user_agent: ua,
});

async function load() {
  vi.resetModules();
  const analytics = await import("@/lib/analyticsService");
  expect(await analytics.loadServerAnalytics()).toBe(true);
  return analytics;
}

describe("reading the paper's analytics", () => {
  beforeEach(() => {
    tables.article_views = [];
    tables.article_engagement = [];
  });

  it("counts unique visitors by visitor, not by browser", async () => {
    // Three readers, all on the same model of phone — which the old code counted as one.
    tables.article_views = [view(1, "a"), view(2, "a"), view(3, "a"), view(1, "b")];
    const { getAnalyticsSummary, getTopArticles } = await load();

    const summary = getAnalyticsSummary(30);
    expect(summary.totalViews).toBe(4);
    expect(summary.uniqueVisitors).toBe(3);
    expect(getTopArticles(5, 30)[0]).toMatchObject({ id: "a", views: 3, engagement: { uniqueViews: 3 } });
  });

  it("reads past Supabase's 1,000-row cap", async () => {
    tables.article_views = Array.from({ length: 2500 }, (_, i) => view(i, "a"));
    const { getAnalyticsSummary } = await load();
    expect(getAnalyticsSummary(null).totalViews).toBe(2500);
  });

  it("folds old-style repeat rows into one view and leaves out bots", async () => {
    const t = Date.now() - 3600_000;
    const old = (id: string, offset: number, extra: Record<string, unknown> = {}) => ({
      id, article_id: "a", timestamp: new Date(t + offset).toISOString(),
      duration: null, scroll_depth: null, user_agent: "Chrome", ...extra,
    });
    tables.article_views = [
      old("x_1", 0),                     // opening row
      old("x_2", 800),                   // the same visit again when the body loaded
      old("x_3", 1500, { duration: 1 }), // the two-step load's leaving row, not a reader
      old("x_4", 90_000, { duration: 45, scroll_depth: 80 }),
      old("x_5", 120_000, { user_agent: "Googlebot/2.1" }),
    ];
    const { getAnalyticsSummary, getTopArticles, getUniqueVisitorsSince } = await load();

    const summary = getAnalyticsSummary(30);
    expect(summary.totalViews).toBe(1);
    expect(summary.uniqueVisitors).toBe(0); // old rows cannot say who read them
    expect(summary.avgReadSeconds).toBe(45);
    expect(getTopArticles(5, 30)[0].engagement.avgScrollDepth).toBe(80);
    expect(getUniqueVisitorsSince()).toBeNull();
  });

  it("keeps the longest read of each visit and counts bounces from timed visits", async () => {
    tables.article_views = [view(1, "a"), view(2, "a")];
    const read = (viewId: string, seconds: number, scroll: number) => ({
      id: Math.random().toString(36), article_id: "a", type: "read", timestamp: ago(30_000),
      data: { view: viewId, seconds, scroll },
    });
    tables.article_engagement = [
      read("v-one", 6, 20),
      read("v-one", 40, 90),  // the same visit, reported again on leaving
      read("v-two", 3, 10),   // left almost at once
      { id: "s1", article_id: "a", type: "share", timestamp: ago(10_000), data: {} },
      { id: "s2", article_id: "a", type: "save", timestamp: ago(10_000), data: {} },
    ];
    const { getTopArticles } = await load();

    const e = getTopArticles(5, 30)[0].engagement;
    expect(e.avgDuration).toBe((40 + 3) / 2);
    expect(e.avgScrollDepth).toBe(50);
    expect(e.bounceRate).toBe(50);
    expect(e.shares).toBe(1);
    expect(e.saves).toBe(1);
  });

  it("applies the date range to the numbers and compares with the period before", async () => {
    tables.article_views = [
      view(1, "a", ago(40 * DAY)),
      view(2, "a", ago(35 * DAY)),
      view(3, "a", ago(2 * DAY)),
    ];
    const { getAnalyticsSummary } = await load();

    expect(getAnalyticsSummary(30).totalViews).toBe(1);
    expect(getAnalyticsSummary(30).growthRate).toBe(-50);
    expect(getAnalyticsSummary(null).totalViews).toBe(3);
    expect(getAnalyticsSummary(null).growthRate).toBeNull();
  });
});

describe("recording a visit", () => {
  let visibility: DocumentVisibilityState = "visible";
  const sent: Array<{ table: string; body: Record<string, unknown>; keepalive: boolean }> = [];

  beforeEach(() => {
    sent.length = 0;
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon");
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      sent.push({
        table: url.split("/rest/v1/")[1],
        body: JSON.parse(String(init.body)),
        keepalive: Boolean(init.keepalive),
      });
      return new Response(null, { status: 201 });
    }));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("writes one view, then the time on screen when the tab is hidden, and nothing twice", async () => {
    vi.resetModules();
    const { startArticleVisit, visitorFromViewId } = await import("@/lib/analyticsService");

    const leave = startArticleVisit("a", "story-a");
    expect(sent).toHaveLength(1);
    expect(sent[0].table).toBe("article_views");
    const viewId = String(sent[0].body.id);
    expect(visitorFromViewId(viewId)).toMatch(/^[0-9a-f]{16}$/);

    vi.advanceTimersByTime(42_000);
    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(sent[1]).toMatchObject({ table: "article_engagement", keepalive: true });
    expect(sent[1].body).toMatchObject({ type: "read", data: { view: viewId, seconds: 42 } });

    // Time in a background tab does not count, and leaving with nothing new sends nothing.
    vi.advanceTimersByTime(600_000);
    leave();
    expect(sent).toHaveLength(2);
  });

  it("gives the same browser the same visitor id on its next visit", async () => {
    vi.resetModules();
    const { startArticleVisit, visitorFromViewId } = await import("@/lib/analyticsService");
    startArticleVisit("a", "story-a")();
    startArticleVisit("b", "story-b")();
    const views = sent.filter((s) => s.table === "article_views").map((s) => visitorFromViewId(String(s.body.id)));
    expect(views[0]).toBe(views[1]);
  });
});
