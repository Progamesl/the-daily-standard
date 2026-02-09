import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Search, Home, FileText } from "lucide-react";
import { sections } from "@/data/seedData";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center flow-container py-16">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-6xl md:text-8xl font-serif font-bold text-muted-foreground/30 mb-4">
            404
          </p>
          <h1 className="font-serif text-2xl md:text-3xl font-bold mb-3">
            Page not found
          </h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button asChild size="lg" className="gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/">
                <Search className="h-4 w-4" />
                Search
              </Link>
            </Button>
          </div>
          <div className="border-t border-border pt-8">
            <p className="text-sm font-medium text-muted-foreground mb-4">Browse sections</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sections.slice(0, 8).map((s) => (
                <Link
                  key={s.slug}
                  to={`/section/${s.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
