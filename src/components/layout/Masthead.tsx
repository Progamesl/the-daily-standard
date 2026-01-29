import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, User, Menu, X, Cloud, Sun } from "lucide-react";
import { formatDate } from "@/data/seedData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  { name: "World", slug: "world" },
  { name: "U.S.", slug: "us" },
  { name: "Politics", slug: "politics" },
  { name: "Business", slug: "business" },
  { name: "Technology", slug: "technology" },
  { name: "Science", slug: "science" },
  { name: "Health", slug: "health" },
  { name: "Sports", slug: "sports" },
  { name: "Arts", slug: "arts" },
  { name: "Opinion", slug: "opinion" },
];

export function Masthead() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const today = new Date();

  return (
    <>
      <header
        className={cn(
          "masthead-sticky border-b border-border bg-background transition-all duration-300",
          isScrolled && "masthead-condensed"
        )}
      >
        {/* Top utility bar - hidden when scrolled */}
        <div
          className={cn(
            "container-newspaper transition-all duration-300 overflow-hidden",
            isScrolled ? "h-0 opacity-0" : "h-auto opacity-100"
          )}
        >
          <div className="flex items-center justify-between py-2 text-xs">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>{formatDate(today)}</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:flex items-center gap-1">
                <Sun className="h-3 w-3" />
                72°F New York
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>

        {/* Main masthead */}
        <div className="container-newspaper">
          <div className="flex items-center justify-between py-4">
            {/* Left: Mobile menu + Search */}
            <div className="flex items-center gap-2 w-32">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-muted rounded-sm transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <button className="p-2 hover:bg-muted rounded-sm transition-colors" aria-label="Search">
                <Search className="h-5 w-5" />
              </button>
            </div>

            {/* Center: Logo/Wordmark */}
            <Link to="/" className="flex-1 text-center flex flex-col items-center">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDipdfJoNun68DCzbb0IGCbIZOjiBu7a7URg&s"
                alt="The Octagon Logo"
                className={cn(
                  "transition-all duration-300 object-contain",
                  isScrolled ? "h-8" : "h-16 md:h-20"
                )}
              />
              <h1
                className={cn(
                  "font-serif font-bold tracking-tight transition-all duration-300",
                  isScrolled ? "text-xl md:text-2xl mt-1" : "text-3xl md:text-5xl mt-2"
                )}
              >
                The Octagon
              </h1>
              {!isScrolled && (
                <p className="text-xs text-muted-foreground mt-1 hidden md:block">
                  A Sacramento Country Day School Newspaper
                </p>
              )}
            </Link>

            {/* Right: Account + Subscribe */}
            <div className="flex items-center gap-2 w-32 justify-end">
              <button className="p-2 hover:bg-muted rounded-sm transition-colors" aria-label="Account">
                <User className="h-5 w-5" />
              </button>
              <Button
                variant="default"
                size="sm"
                className="hidden sm:inline-flex text-xs font-semibold tracking-wide"
              >
                Subscribe
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
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="container-newspaper py-4">
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
                      className="block px-4 py-3 text-lg font-medium text-foreground hover:bg-muted rounded-sm transition-colors border-b border-border"
                    >
                      {section.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-8 pt-8 border-t border-border">
              <Button variant="default" size="lg" className="w-full font-semibold">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
