import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, User, Menu, X, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog } from "lucide-react";
import { formatDate } from "@/data/seedData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSacramentoWeather } from "@/hooks/useSacramentoWeather";
import { SearchDialog } from "@/components/search/SearchDialog";
import { UserMenu } from "@/components/user/UserMenu";

const sections = [
  { name: "News", slug: "us" },
  { name: "Arts & Entertainment", slug: "arts" },
  { name: "Opinion", slug: "opinion" },
  { name: "Editorial", slug: "editorial" },
  { name: "Sports", slug: "sports" },
  { name: "Features", slug: "features" },
];

function WeatherIcon({ code }: { code: number }) {
  if (code === 0) return <Sun className="h-3 w-3" />;
  if (code >= 1 && code <= 3) return <Cloud className="h-3 w-3" />;
  if (code === 45 || code === 48) return <CloudFog className="h-3 w-3" />;
  if (code >= 51 && code <= 67) return <CloudRain className="h-3 w-3" />;
  if (code >= 71 && code <= 77) return <CloudSnow className="h-3 w-3" />;
  if (code >= 80 && code <= 86) return <CloudRain className="h-3 w-3" />;
  if (code >= 95 && code <= 99) return <CloudLightning className="h-3 w-3" />;
  return <Cloud className="h-3 w-3" />;
}

export function Masthead() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { temp, weatherCode, loading, error } = useSacramentoWeather();

  useEffect(() => {
    // The masthead sits in normal flow, so collapsing it removes about 110px of
    // page height. The browser's scroll anchoring then shifts scrollY to keep
    // the content steady — which drops you back under the expand threshold, so
    // it expands, which pushes you back over the collapse threshold. That loop
    // is what made the header jitter violently while scrolling.
    //
    // The fix is to make the gap between the thresholds wider than the height
    // the header can lose, so a scroll-anchoring correction can never carry the
    // reader back across the other threshold: the header loses ~109px on
    // desktop and ~76px on mobile against a 170px gap. A short settle period
    // after each change stops the 300ms transition feeding back in as well.
    //
    // Deliberately NOT disabling scroll anchoring globally to achieve this —
    // that would stop the browser holding your place when images load further
    // up the page, trading a header bug for a scrolling one.
    const CONDENSE_AT = 260;
    const EXPAND_AT = 90;
    const SETTLE_MS = 380;

    let rafId: number | null = null;
    let condensed = false;
    let lockedUntil = 0;

    const evaluate = () => {
      rafId = null;
      if (performance.now() < lockedUntil) return;

      const y = window.scrollY;
      const next = condensed ? y > EXPAND_AT : y > CONDENSE_AT;
      if (next !== condensed) {
        condensed = next;
        lockedUntil = performance.now() + SETTLE_MS;
        setIsScrolled(next);
      }
    };

    const handleScroll = () => {
      if (rafId === null) rafId = requestAnimationFrame(evaluate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // set the correct state on load / restored scroll position
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const today = new Date();
  const weatherLabel = loading ? "—° Sacramento" : error ? "Sacramento" : `${Math.round(temp)}°F Sacramento`;

  return (
    <>
      <header
        className={cn(
          "masthead-sticky border-b border-border bg-background",
          isScrolled && "masthead-condensed"
        )}
      >
        {/* Top utility bar */}
        <div
          className="container-newspaper grid overflow-hidden"
          style={{
            gridTemplateRows: isScrolled ? '0fr' : '1fr',
            transition: 'grid-template-rows 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="min-h-0 overflow-hidden">
          <div className="flex items-center justify-between py-2 text-xs">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{formatDate(today)}</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:flex items-center gap-1" title="Sacramento, CA weather">
                <WeatherIcon code={weatherCode} />
                {weatherLabel}
              </span>
            </div>
            {/* Hidden on phones: four links plus the date in ~400px squeezed the
                date onto two lines. These live in the mobile menu instead. */}
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/advertise" className="font-semibold text-accent hover:text-foreground transition-colors">Advertise</Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/staff" className="font-semibold text-accent hover:text-foreground transition-colors">Staff</Link>
            </div>
          </div>
          </div>
        </div>

        {/* Main masthead */}
        <div className="container-newspaper">
          <div 
            className={cn(
              "flex items-center justify-between transition-[padding] duration-300 ease-in-out",
              isScrolled ? "py-2" : "py-4"
            )}
          >
            {/* Left: Mobile menu + Search */}
            <div className="flex items-center gap-1 sm:gap-2 w-20 sm:w-32">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 hover:bg-muted rounded-lg transition-colors touch-manipulation"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 hover:bg-muted rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>

            {/* Center: Logo/Wordmark */}
            <Link
              to="/"
              className={cn(
                "flex-1 relative flex items-center justify-center min-w-0 overflow-hidden",
                "transition-[height] duration-300 ease-in-out",
                isScrolled ? "h-9 sm:h-10" : "h-24 sm:h-28 md:h-36"
              )}
            >
              {/* Expanded logo — fades out when condensing */}
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center",
                  "transition-opacity duration-300 ease-in-out",
                  isScrolled ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
              >
                <img
                  src="/favicon.png"
                  alt=""
                  width={80}
                  height={80}
                  className="object-contain h-8 sm:h-14 md:h-[4.5rem] w-auto mix-blend-multiply dark:mix-blend-normal"
                />
                {/* The file has a pure-white background, which sat as a white
                    square on the off-white page. Multiply lets the page colour
                    show through the white and leaves the red alone. Not in dark
                    mode, where it would darken the red into the background. */}
                <h1 className="font-serif font-bold tracking-tight text-2xl sm:text-3xl md:text-5xl mt-1">
                  The Octagon
                </h1>
                {/* Kept to one line on phones: at the default size this wrapped to
                    two lines and overflowed the fixed-height masthead, slicing
                    the word "Newspaper" in half. */}
                <p className="mt-1 whitespace-nowrap text-[10px] leading-tight text-muted-foreground sm:whitespace-normal sm:text-xs">
                  A Sacramento Country Day School Newspaper
                </p>
              </div>

              {/* Condensed logo — fades in when condensing */}
              <div
                className={cn(
                  "transition-opacity duration-300 ease-in-out",
                  isScrolled ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                <span className="font-serif font-bold tracking-tight text-xl sm:text-2xl">
                  The Octagon
                </span>
              </div>
            </Link>

            {/* Right: Account + Subscribe */}
            <div className="flex items-center gap-1 sm:gap-2 w-20 sm:w-32 justify-end">
              <button
                onClick={() => setUserMenuOpen(true)}
                className="p-2.5 hover:bg-muted rounded-lg transition-colors touch-manipulation"
                aria-label="Your account"
              >
                <User className="h-5 w-5" />
              </button>
              <Button asChild variant="default" size="sm" className="hidden sm:inline-flex text-xs font-semibold tracking-wide">
                <Link to="/subscribe">Subscribe</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:block border-t border-border" aria-label="Main navigation">
          <div className="container-newspaper">
            <ul className="flex items-center justify-center gap-1 py-2">
              {sections.map((section) => (
                <li key={section.slug}>
                  <Link
                    to={`/section/${section.slug}`}
                    className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-sm transition-colors"
                  >
                    {section.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/*
        Mobile Navigation Menu.
        z must beat the masthead, which is z-index:100 (.masthead-sticky).
        At z-50 the header painted over the top of this panel, hiding the
        "Sections" heading, the close button and the first links.
      */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[120] bg-background overflow-y-auto overscroll-contain">
          {/* Extra bottom room so the last item clears the phone browser's
              floating toolbar, which overlays the viewport. */}
          <div
            className="container-newspaper py-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl font-bold">Sections</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-muted rounded-sm transition-colors"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav aria-label="Mobile navigation">
              <ul className="space-y-1">
                {sections.map((section) => (
                  <li key={section.slug}>
                    <Link
                      to={`/section/${section.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-4 text-lg font-medium text-foreground hover:bg-muted active:bg-muted rounded-lg transition-colors border-b border-border touch-manipulation"
                    >
                      {section.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {/* Secondary links. On phones the top utility bar is hidden, so
                without these there'd be no way to reach these pages at all. */}
            <nav className="mt-8 pt-6 border-t border-border" aria-label="More">
              <ul className="grid grid-cols-2 gap-1">
                {[
                  { to: '/about', label: 'About' },
                  { to: '/contact', label: 'Contact' },
                  { to: '/advertise', label: 'Advertise' },
                  { to: '/staff', label: 'Staff' },
                ].map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted touch-manipulation"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6 pt-6 border-t border-border">
              <Button asChild variant="default" size="lg" className="w-full font-semibold" onClick={() => setMobileMenuOpen(false)}>
                <Link to="/subscribe">Subscribe</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <UserMenu open={userMenuOpen} onClose={() => setUserMenuOpen(false)} />
    </>
  );
}
