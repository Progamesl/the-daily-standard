import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  User, Bookmark, History, Settings, Moon, Sun, Mail,
  TrendingUp, X, ChevronRight, Trash2, Clock, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getArticleBySlug, formatTimestamp, Article } from "@/data/seedData";
import { getImageOrNull } from "@/lib/imageHelpers";

const SAVED_KEY = "octagon-saved-articles";
const HISTORY_KEY = "octagon-reading-history";
const PREFS_KEY = "octagon-user-prefs";
const SUB_KEY = "octagon-newsletter-sub";

interface HistoryEntry { slug: string; ts: number }
interface UserPrefs {
  name: string;
  darkMode: boolean;
  favSections: string[];
}

const defaultPrefs: UserPrefs = { name: "", darkMode: false, favSections: [] };

function getSavedSlugs(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch { return defaultPrefs; }
}

export function addToHistory(slug: string) {
  try {
    const hist = getHistory().filter((h) => h.slug !== slug);
    hist.unshift({ slug, ts: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 50)));
  } catch { /* noop */ }
}

type Tab = "saved" | "history" | "settings";

interface UserMenuProps {
  open: boolean;
  onClose: () => void;
}

export function UserMenu({ open, onClose }: UserMenuProps) {
  const [tab, setTab] = useState<Tab>("saved");
  const [saved, setSaved] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [prefs, setPrefs] = useState<UserPrefs>(defaultPrefs);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const reload = useCallback(() => {
    setSaved(getSavedSlugs());
    setHistory(getHistory());
    setPrefs(getPrefs());
    setIsSubscribed(!!localStorage.getItem(SUB_KEY));
  }, []);

  useEffect(() => { if (open) reload(); }, [open, reload]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);

  const savePrefs = (p: UserPrefs) => {
    setPrefs(p);
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  };

  const removeSaved = (slug: string) => {
    const next = saved.filter((s) => s !== slug);
    setSaved(next);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const toggleDark = () => {
    const next = { ...prefs, darkMode: !prefs.darkMode };
    savePrefs(next);
    document.documentElement.classList.toggle("dark", next.darkMode);
  };

  const toggleSection = (s: string) => {
    const favs = prefs.favSections.includes(s)
      ? prefs.favSections.filter((x) => x !== s)
      : [...prefs.favSections, s];
    savePrefs({ ...prefs, favSections: favs });
  };

  if (!open) return null;

  const savedArticles = saved.map((slug) => getArticleBySlug(slug)).filter(Boolean) as Article[];
  const historyArticles = history
    .map((h) => ({ article: getArticleBySlug(h.slug), ts: h.ts }))
    .filter((h) => h.article) as { article: Article; ts: number }[];

  const allSections = ["world", "us", "politics", "business", "technology", "science", "health", "sports", "arts", "opinion"];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-[201] w-full max-w-md h-full bg-background shadow-2xl border-l border-border overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {prefs.name || "Reader"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isSubscribed ? "Newsletter subscriber" : "Welcome to The Octagon"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 border-b border-border">
          <div className="px-4 py-3 text-center border-r border-border">
            <div className="text-lg font-bold text-foreground">{saved.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved</div>
          </div>
          <div className="px-4 py-3 text-center border-r border-border">
            <div className="text-lg font-bold text-foreground">{history.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Read</div>
          </div>
          <div className="px-4 py-3 text-center">
            <div className="text-lg font-bold text-accent">{prefs.favSections.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Interests</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {([
            { id: "saved" as Tab, label: "Saved", icon: Bookmark },
            { id: "history" as Tab, label: "History", icon: History },
            { id: "settings" as Tab, label: "Settings", icon: Settings },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "saved" && (
            <div className="p-4">
              {savedArticles.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No saved articles yet</p>
                  <p className="text-xs text-muted-foreground/70">
                    Tap the bookmark icon on any article to save it for later
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedArticles.map((a) => {
                    const img = getImageOrNull(a.image, a.images);
                    return (
                      <div key={a.slug} className="group flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <Link to={`/article/${a.slug}`} onClick={onClose} className="flex gap-3 flex-1 min-w-0">
                          {img && (
                            <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">{a.section}</span>
                            <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mt-0.5">{a.headline}</h4>
                            <span className="text-xs text-muted-foreground mt-1 block">{formatTimestamp(a.publishedAt)}</span>
                          </div>
                        </Link>
                        <button
                          onClick={() => removeSaved(a.slug)}
                          className="p-2 sm:p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all self-start touch-manipulation text-muted-foreground"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="p-4">
              {historyArticles.length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">No reading history</p>
                  <p className="text-xs text-muted-foreground/70">
                    Articles you read will appear here
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recently read</span>
                    <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-600 transition-colors">Clear all</button>
                  </div>
                  <div className="space-y-2">
                    {historyArticles.slice(0, 20).map(({ article: a, ts }) => {
                      const img = getImageOrNull(a.image, a.images);
                      const ago = getTimeAgo(ts);
                      return (
                        <Link key={a.slug + ts} to={`/article/${a.slug}`} onClick={onClose} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          {img && (
                            <img src={img} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{a.headline}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{ago}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center flex-shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="p-4 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Your name
                </label>
                <input
                  type="text"
                  value={prefs.name}
                  onChange={(e) => savePrefs({ ...prefs, name: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {/* Dark mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {prefs.darkMode ? <Moon className="h-4 w-4 text-accent" /> : <Sun className="h-4 w-4 text-amber-500" />}
                  <div>
                    <span className="text-sm font-medium text-foreground">Dark mode</span>
                    <p className="text-xs text-muted-foreground">Easier on the eyes at night</p>
                  </div>
                </div>
                <button
                  onClick={toggleDark}
                  className={`relative w-11 h-6 rounded-full transition-colors ${prefs.darkMode ? "bg-accent" : "bg-slate-300"}`}
                  aria-label="Toggle dark mode"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs.darkMode ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Your interests
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select topics to personalize your feed
                </p>
                <div className="flex flex-wrap gap-2">
                  {allSections.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSection(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                        prefs.favSections.includes(s)
                          ? "bg-accent text-white border-accent"
                          : "bg-background text-foreground border-border hover:border-accent/50"
                      }`}
                    >
                      {s === "us" ? "U.S." : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Newsletter status */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Newsletter</span>
                </div>
                {isSubscribed ? (
                  <p className="text-xs text-muted-foreground">
                    You're subscribed! Manage your preferences on the{" "}
                    <Link to="/subscribe" onClick={onClose} className="text-accent underline underline-offset-2">subscribe page</Link>.
                  </p>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Get the best stories delivered to your inbox.</p>
                    <Button asChild size="sm" variant="default" className="w-full text-xs font-semibold">
                      <Link to="/subscribe" onClick={onClose}>Subscribe — Free</Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Reading stats */}
              <div className="rounded-xl border border-border p-4 bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">Your reading stats</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{history.length}</div>
                    <div className="text-xs text-muted-foreground">Articles read</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{saved.length}</div>
                    <div className="text-xs text-muted-foreground">Bookmarked</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {historyArticles.reduce((acc, h) => acc + (h.article.readingTime ?? 0), 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Min read (est.)</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{prefs.favSections.length}</div>
                    <div className="text-xs text-muted-foreground">Topics followed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-border px-5 py-3 bg-muted/30">
          <Button asChild variant="default" size="sm" className="w-full font-semibold text-xs">
            <Link to="/subscribe" onClick={onClose}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              {isSubscribed ? "Manage subscription" : "Subscribe to The Octagon"}
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
