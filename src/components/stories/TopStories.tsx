import { Link } from "react-router-dom";
import { Article, formatTimestamp, getSectionBySlug } from "@/data/seedData";
import { cn } from "@/lib/utils";
import { enhanceArticleImage, SITE_PLACEHOLDER } from "@/lib/imageHelpers";

interface TopStoriesProps {
  articles: Article[];
  className?: string;
}

export function TopStories({ articles, className }: TopStoriesProps) {
  return (
    <aside className={cn("", className)}>
      <h2 className="font-sans text-[11px] font-bold uppercase tracking-widest text-foreground mb-6">
        Top Stories
      </h2>
      <div className="space-y-5">
        {articles.map((article) => (
          <article key={article.id} className="group border-b border-border last:border-0 pb-5 last:pb-0">
            <Link to={`/article/${article.slug}`} className="flex gap-4">
                            <figure className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden bg-muted shadow-md">
                              <img
                                src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                alt={article.headline}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                              />
                            </figure>
              <div className="flex-1 min-w-0">
                <span className="label text-[10px] text-accent">{getSectionBySlug(article.section)?.name ?? article.section}</span>
                <h3 className="font-serif text-sm md:text-base font-semibold leading-snug text-balance group-hover:text-accent transition-colors mt-0.5 mb-1 line-clamp-2">
                  {article.headline}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {article.dek}
                </p>
                <span className="timestamp text-xs">{formatTimestamp(article.publishedAt)}</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
}
