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
    // Hysteresis thresholds — wide gap prevents rapid back-and-forth flipping
    // when the user is scrolling right at the boundary.
    const SCROLL_DOWN_THRESHOLD = 120;  // condense when scrolling past this
    const SCROLL_UP_THRESHOLD   =  60;  // expand  when scrolling back above this

    let rafId: number | null = null;
    let lastScrolled = false;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        ticking = false;
        const y = window.scrollY;
        const next = lastScrolled
          ? y > SCROLL_UP_THRESHOLD    // already condensed → stay condensed until below 60
          : y > SCROLL_DOWN_THRESHOLD; // not condensed   → condense once past 120
        if (next !== lastScrolled) {
          lastScrolled = next;
          setIsScrolled(next);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
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
            <div className="flex items-center gap-3">
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/advertise" className="font-semibold hover:text-foreground transition-colors" style={{ color: "#8B1A1A" }}>Advertise</Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/staff" className="font-semibold hover:text-foreground transition-colors" style={{ color: "#8B1A1A" }}>Staff</Link>
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
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDipdfJoNun68DCzbb0IGCbIZOjiBu7a7URg&s"
                  alt="The Octagon Logo"
                  width={80}
                  height={80}
                  className="object-contain h-10 sm:h-14 md:h-[4.5rem] w-auto"
                />
                <h1 className="font-serif font-bold tracking-tight text-2xl sm:text-3xl md:text-5xl mt-1">
                  The Octagon
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
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

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background overflow-y-auto overscroll-contain">
          <div className="container-newspaper py-4 pb-safe">
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
            <div className="mt-8 pt-8 border-t border-border">
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
