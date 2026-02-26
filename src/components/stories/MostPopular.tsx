import { Link } from "react-router-dom";
import { Article, formatTimestamp } from "@/data/seedData";
import { cn } from "@/lib/utils";

interface MostPopularProps {
  articles: Article[];
  className?: string;
}

export function MostPopular({ articles, className }: MostPopularProps) {
  return (
    <aside className={cn("", className)} aria-labelledby="most-popular-heading">
      <h2 id="most-popular-heading" className="font-sans text-sm font-bold uppercase tracking-widest text-foreground mb-6">
        Latest Stories
      </h2>
      <ol className="space-y-0">
        {articles.slice(0, 10).map((article, index) => (
          <li
            key={article.id}
            className="group py-4 border-b border-border last:border-0 last:pb-0"
          >
            <Link to={`/article/${article.slug}`} className="flex items-start gap-3">
              <span className="flex-shrink-0 font-serif text-2xl font-bold text-muted-foreground/50 w-8 text-center leading-none tabular-nums">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="label text-[10px] text-accent">{article.section}</span>
                <h3 className="font-serif text-sm font-semibold leading-snug text-balance group-hover:text-accent transition-colors line-clamp-3 mt-0.5">
                  {article.headline}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  <span>{formatTimestamp(article.publishedAt)}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
