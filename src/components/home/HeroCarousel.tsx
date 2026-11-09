import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import { type Article, formatTimestamp, getSectionBySlug } from "@/data/seedData";
import { getImageOrNull, SITE_PLACEHOLDER } from "@/lib/imageHelpers";
import { SmartImage } from "@/components/ui/SmartImage";
import { bylineText } from "@/lib/coAuthors";
import { CAROUSEL_SECONDS } from "@/lib/homepageCarousel";
import { cn } from "@/lib/utils";

/**
 * The homepage lead: up to four stories, fading from one to the next every
 * CAROUSEL_SECONDS. Which stories, and in what order, is decided on the
 * homepage (see src/lib/homepageCarousel.ts); this only shows them.
 *
 * It stops moving while the reader is pointing at it or has focus inside it —
 * nobody should have a headline swap out from under the click — and while the
 * tab is in the background. Anyone can stop it for good with the pause button,
 * and it never moves on its own for a reader who has asked their device for
 * reduced motion.
 */
export function HeroCarousel({ articles }: { articles: Article[] }) {
  const count = articles.length;
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // A fresh data sync can hand over fewer slides than before.
  const current = count ? active % count : 0;
  const paused = userPaused || held || hidden || reducedMotion;

  // A timer per slide rather than one interval, so choosing a slide by hand
  // gives it the full CAROUSEL_SECONDS before the next one.
  useEffect(() => {
    if (paused || count < 2) return;
    const timer = setTimeout(() => setActive((i) => (i + 1) % count), CAROUSEL_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [current, paused, count]);

  if (!count) return null;

  return (
    <section
      className="w-full relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Top stories"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      // Keyboard focus only: a mouse click on a dot also focuses it, and
      // holding on that would leave the carousel stopped after the pointer left.
      onFocusCapture={(e) => {
        let keyboard = true;
        try { keyboard = (e.target as HTMLElement).matches(":focus-visible"); } catch { /* older browsers */ }
        if (keyboard) setHeld(true);
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      {/* 21:9 on a phone is a ~177px letterbox: object-cover crops the photo to
          a slice and the headline alone nearly fills it. Give mobile a
          portrait-ish frame and save the cinematic ratio for wide screens,
          where it has the height to work. */}
      <div
        className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.35/1] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        aria-live={paused ? "polite" : "off"}
      >
        {articles.map((article, i) => {
          const isActive = i === current;
          return (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${article.headline}`}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "absolute inset-0 block group cursor-pointer transition-opacity duration-1000 ease-in-out motion-reduce:transition-none",
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
              )}
            >
              {/* Never upscale: a sub-1200px archive image stretched across a
                  full-bleed hero is a 2-4x blow-up and looks broken. */}
              <SmartImage
                src={getImageOrNull(article.image, article.images) ?? SITE_PLACEHOLDER}
                alt={article.headline}
                loading={i === 0 ? "eager" : "lazy"}
                minWidthForCover={1400}
                className="transition-transform duration-[2800ms] ease-out group-hover:scale-[1.06]"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              {/* Gradient overlays for text readability - balanced to preserve image visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/75" />
              {/* Subtle dark overlay at bottom for text area only */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/65 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 md:p-10 lg:p-12 xl:p-16">
                <div className="flow-container">
                  <div className="max-w-4xl">
                    <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/90 mb-2 sm:mb-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                      {getSectionBySlug(article.section)?.name ?? article.section}
                    </span>
                    {/* Only the slide on show is the page's main heading. */}
                    {isActive ? (
                      <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-bold leading-[1.1] mb-3 sm:mb-4 text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] tracking-tight">
                        {article.headline}
                      </h1>
                    ) : (
                      <p className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-bold leading-[1.1] mb-3 sm:mb-4 text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] tracking-tight">
                        {article.headline}
                      </p>
                    )}
                    <p className="font-serif text-sm sm:text-lg md:text-xl lg:text-2xl text-white mb-3 sm:mb-5 line-clamp-2 leading-relaxed max-w-3xl font-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                      {article.dek}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                      <span className="font-medium">{bylineText(article)}</span>
                      <span className="text-white/50">·</span>
                      <span>{formatTimestamp(article.publishedAt)}</span>
                      {article.readingTime && (
                        <>
                          <span className="text-white/50">·</span>
                          <span>{article.readingTime} min read</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Top right, clear of the headline, which sits at the bottom. On a
            touch screen every button is at least 44px (index.css), which turned
            the dark pill into a band across most of the photo, so there the
            dots stand on their own with a shadow instead. */}
        {count > 1 && (
          <div className="absolute top-1 right-1 sm:top-5 sm:right-5 z-20 flex items-center gap-1 rounded-full bg-black/35 backdrop-blur-md border border-white/15 px-1.5 py-1 [@media(pointer:coarse)]:bg-transparent [@media(pointer:coarse)]:border-transparent [@media(pointer:coarse)]:backdrop-blur-none [@media(pointer:coarse)]:gap-0 [@media(pointer:coarse)]:px-0">
            {articles.map((article, i) => (
              <button
                key={article.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show story ${i + 1} of ${count}: ${article.headline}`}
                aria-current={i === current}
                className="grid h-7 w-7 place-items-center rounded-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(0,0,0,0.55)]",
                    i === current ? "w-5 bg-white" : "w-2 bg-white/50 hover:bg-white/80",
                  )}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Play the top stories" : "Pause the top stories"}
              className="grid h-7 w-7 place-items-center rounded-full text-white/80 hover:text-white touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {userPaused
                ? <Play className="h-3.5 w-3.5 drop-shadow-[0_0_4px_rgba(0,0,0,0.7)]" />
                : <Pause className="h-3.5 w-3.5 drop-shadow-[0_0_4px_rgba(0,0,0,0.7)]" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
