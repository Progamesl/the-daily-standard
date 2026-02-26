import { useState, FormEvent } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Mail, Newspaper, Zap, BookOpen, Bell, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeToList } from "@/lib/emailOctopus";

const STORAGE_KEY = "octagon-newsletter-sub";

type SubStatus = "idle" | "submitting" | "success" | "error";

interface Preferences {
  breaking: boolean;
  daily: boolean;
  weekly: boolean;
  opinion: boolean;
  sports: boolean;
  arts: boolean;
}

const defaultPrefs: Preferences = {
  breaking: true,
  daily: true,
  weekly: false,
  opinion: false,
  sports: false,
  arts: false,
};

const newsletters = [
  { key: "breaking" as const, label: "Breaking News", desc: "Get notified the moment major stories break", icon: Zap, frequency: "As it happens" },
  { key: "daily" as const, label: "The Daily Digest", desc: "A curated roundup of the day's top stories", icon: Newspaper, frequency: "Every morning" },
  { key: "weekly" as const, label: "Weekend Read", desc: "Long-form features and in-depth reporting", icon: BookOpen, frequency: "Every Saturday" },
  { key: "opinion" as const, label: "Opinion & Editorials", desc: "Student voices and editorial perspectives", icon: Sparkles, frequency: "Twice a week" },
  { key: "sports" as const, label: "Sports Update", desc: "Scores, recaps, and athlete spotlights", icon: Bell, frequency: "Game days" },
  { key: "arts" as const, label: "Arts & Culture", desc: "Reviews, previews, and creative showcases", icon: Mail, frequency: "Weekly" },
];

function getSavedEmail(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export default function SubscribePage() {
  const existingEmail = getSavedEmail();
  const [email, setEmail] = useState(existingEmail ?? "");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<SubStatus>(existingEmail ? "success" : "idle");
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const togglePref = (key: keyof Preferences) => setPrefs((p) => ({ ...p, [key]: !p[key] }));
  const selectedCount = Object.values(prefs).filter(Boolean).length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    const result = await subscribeToList(trimmed, firstName.trim() || undefined);
    if (result.ok || (result as { alreadySubscribed?: boolean }).alreadySubscribed) {
      try {
        localStorage.setItem(STORAGE_KEY, trimmed);
        localStorage.setItem(STORAGE_KEY + "-prefs", JSON.stringify(prefs));
        if (firstName.trim()) localStorage.setItem(STORAGE_KEY + "-name", firstName.trim());
      } catch { /* ignore storage errors */ }
      setStatus("success");
    } else {
      setErrorMsg((result as { message: string }).message);
      setStatus("error");
    }
  };

  const handleUnsubscribe = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + "-prefs");
    localStorage.removeItem(STORAGE_KEY + "-name");
    setEmail("");
    setFirstName("");
    setStatus("idle");
    setPrefs(defaultPrefs);
  };

  return (
    <Layout>
      <div className="min-h-[80vh] bg-gradient-to-b from-background via-background to-muted/30">
        {/* Hero */}
        <section className="flow-container pt-10 pb-8 sm:pt-16 sm:pb-12 md:pt-24 md:pb-16 text-center">
          <div className="max-w-2xl mx-auto px-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Free newsletter
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-5 text-slate-900">
              Stay informed.{" "}
              <span className="bg-gradient-to-r from-accent to-red-700 bg-clip-text text-transparent">Stay ahead.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-lg mx-auto">
              Get the best of The Octagon delivered straight to your inbox. Student journalism you can count on.
            </p>
          </div>
        </section>

        {/* Signup form */}
        <section className="flow-container pb-12">
          <div className="max-w-xl mx-auto">
            {status === "success" ? (
              <div className="text-center bg-white rounded-2xl shadow-lg border border-border p-8 md:p-10">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-slate-900 mb-2">You're subscribed!</h2>
                <p className="text-slate-600 mb-1">We'll send updates to:</p>
                <p className="font-medium text-slate-900 mb-6">{email || existingEmail}</p>
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {newsletters.filter((n) => prefs[n.key]).map((n) => (
                    <span key={n.key} className="inline-flex items-center gap-1.5 text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-full">
                      <n.icon className="h-3 w-3" />{n.label}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" size="sm" onClick={() => { setStatus("idle"); setPrefsOpen(true); }}>
                    Change preferences
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleUnsubscribe}>
                    Unsubscribe
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-border p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="sub-fname" className="block text-sm font-medium text-slate-700 mb-1.5">First name <span className="text-slate-400">(optional)</span></label>
                    <Input
                      id="sub-fname"
                      type="text"
                      placeholder="Your name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label htmlFor="sub-email" className="block text-sm font-medium text-slate-700 mb-1.5">Email address <span className="text-red-500">*</span></label>
                    <Input
                      id="sub-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                      className={cn("h-12", status === "error" && "border-red-400 focus-visible:ring-red-400")}
                    />
                  </div>
                </div>

                {status === "error" && errorMsg && (
                  <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
                )}

                {/* Newsletter preferences toggle */}
                <button type="button" onClick={() => setPrefsOpen(!prefsOpen)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-4">
                  <span className="font-medium">Choose your newsletters</span>
                  <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{selectedCount} selected</span>
                  <ArrowRight className={cn("h-3.5 w-3.5 transition-transform", prefsOpen && "rotate-90")} />
                </button>

                {prefsOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    {newsletters.map((n) => (
                      <button
                        type="button"
                        key={n.key}
                        onClick={() => togglePref(n.key)}
                        className={cn(
                          "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                          prefs[n.key]
                            ? "border-accent bg-accent/5 shadow-sm"
                            : "border-border hover:border-slate-300 bg-white"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          prefs[n.key] ? "bg-accent text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          <n.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{n.label}</span>
                            {prefs[n.key] && <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{n.desc}</p>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{n.frequency}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold" disabled={status === "submitting"}>
                  {status === "submitting" ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Subscribing...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Mail className="h-4 w-4" />Subscribe — It's free</span>
                  )}
                </Button>

                <p className="text-xs text-slate-400 text-center mt-3">
                  No spam, ever. Unsubscribe with one click.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Social proof / stats */}
        <section className="flow-container pb-16">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center mb-8 sm:mb-12">
              <div>
                <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">500+</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">Published articles</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">60+</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">Student journalists</div>
              </div>
              <div>
                <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-accent">Free</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">Always</div>
              </div>
            </div>

            {/* What you get */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 md:p-8">
              <h2 className="font-serif text-xl font-bold text-center mb-6 text-slate-900">What you'll get</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Newspaper, title: "Daily digest", text: "The most important stories curated by our editors" },
                  { icon: Zap, title: "Breaking alerts", text: "Be the first to know when big news drops" },
                  { icon: BookOpen, title: "Long-form features", text: "In-depth investigations and profiles" },
                  { icon: Sparkles, title: "Exclusive content", text: "Stories and insights you won't find anywhere else" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 p-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
