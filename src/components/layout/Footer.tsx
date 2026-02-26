import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const footerSections = [
  {
    title: "News",
    links: [
      { name: "World", href: "/section/world" },
      { name: "U.S.", href: "/section/us" },
      { name: "Politics", href: "/section/politics" },
      { name: "Business", href: "/section/business" },
      { name: "Technology", href: "/section/technology" },
    ],
  },
  {
    title: "Arts & Life",
    links: [
      { name: "Arts", href: "/section/arts" },
      { name: "Sports", href: "/section/sports" },
      { name: "Science", href: "/section/science" },
      { name: "Health", href: "/section/health" },
      { name: "Opinion", href: "/section/opinion" },
    ],
  },
  {
    title: "More",
    links: [
      { name: "Subscribe", href: "/subscribe" },
      { name: "About", href: "/about" },
      { name: "Contact", href: "/contact" },
      { name: "Staff", href: "/staff" },
    ],
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error">("idle");
  const [scrolled, setScrolled] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus("success");
    setNewsletterEmail("");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <footer className="bg-foreground text-primary-foreground relative" role="contentinfo">
      {/* Newsletter CTA */}
      <div className="border-b border-primary-foreground/10">
        <div className="flow-container py-10 lg:py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-foreground/10">
                <Mail className="h-6 w-6 text-primary-foreground" />
              </span>
            </div>
            <h3 className="font-serif text-2xl md:text-3xl font-bold mb-2">
              Stay in the loop
            </h3>
            <p className="text-primary-foreground/70 text-sm md:text-base mb-6">
              Get the best of The Octagon delivered to your inbox. No spam, unsubscribe anytime.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 h-11 bg-background/10 border-primary-foreground/20 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-foreground/50"
                aria-label="Email for newsletter"
              />
              <Button
                type="submit"
                variant="secondary"
                className="h-11 px-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Subscribe
              </Button>
            </form>
            {newsletterStatus === "success" && (
              <p className="mt-3 text-sm text-green-400">Thanks! Check your inbox to confirm.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="flow-container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block">
              <h2 className="font-serif text-2xl font-bold mb-4">The Octagon</h2>
            </Link>
            <p className="text-sm text-primary-foreground/70 leading-relaxed mb-6">
              A Sacramento Country Day School Newspaper. Trusted journalism for our community.
            </p>
            <div className="flex gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                aria-label="Twitter"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63z" />
                </svg>
              </a>
            </div>
          </div>
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider mb-4 text-primary-foreground/50">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="flow-container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/50">
            <p>© {currentYear} The Octagon. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-primary-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-primary-foreground transition-colors">
                Terms
              </Link>
              <Link to="/accessibility" className="hover:text-primary-foreground transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className={cn(
          "fixed bottom-6 right-6 z-40 p-2 rounded-full bg-foreground text-primary-foreground shadow-lg border border-primary-foreground/20 transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          scrolled ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-label="Back to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </footer>
  );
}
