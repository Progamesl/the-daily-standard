import { Link } from "react-router-dom";
import { Article } from "@/data/seedData";
import { cn } from "@/lib/utils";

interface HeroImageStripProps {
  articles: Article[];
  className?: string;
}

export function HeroImageStrip({ articles, className }: HeroImageStripProps) {
  // Get articles with strong images (prefer those with multiple images or distinct images)
  const withImages = articles.filter((a) => a.image);
  const stripArticles = withImages.length >= 3 ? withImages.slice(0, 6) : articles.slice(0, 6);

  return (
    <aside
      className={cn(
        "hidden lg:block w-full min-h-[100vh] sticky top-0 overflow-hidden",
        className
      )}
      aria-label="Featured visuals"
    >
      <div className="h-full flex flex-col gap-4 py-6 pr-4">
        {/* Main hero - large featured image */}
        {stripArticles[0] && (
          <Link
            to={`/article/${stripArticles[0].slug}`}
            className="group relative flex-1 min-h-[280px] rounded-2xl overflow-hidden shadow-xl ring-2 ring-black/5"
          >
            <img
              src={stripArticles[0].image}
              alt={stripArticles[0].headline}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                Featured
              </span>
              <h3 className="font-serif text-lg md:text-xl font-bold text-white leading-tight mt-1 line-clamp-3 drop-shadow-lg">
                {stripArticles[0].headline}
              </h3>
            </div>
          </Link>
        )}

        {/* Secondary images - 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {stripArticles.slice(1, 5).map((article) => (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden shadow-lg ring-2 ring-black/5"
            >
              <img
                src={article.image}
                alt={article.headline}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h4 className="font-serif text-sm font-bold text-white line-clamp-2 drop-shadow-md">
                  {article.headline}
                </h4>
              </div>
            </Link>
          ))}
        </div>

        {/* Brand moment */}
        <div className="rounded-xl bg-gradient-to-br from-accent to-accent/80 p-5 text-primary-foreground shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">
            The Octagon
          </p>
          <p className="font-serif text-xl font-bold mt-1">
            Sacramento Country Day School
          </p>
          <p className="text-xs opacity-90 mt-2">
            Student journalism that matters.
          </p>
        </div>
      </div>
    </aside>
  );
}
