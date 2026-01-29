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
      {/* Header with rule */}
      <div className="rule-thick pt-4 mb-4">
        <h2 id="most-popular-heading" className="font-serif text-lg font-bold">
          Most Popular
        </h2>
      </div>

      {/* Article list */}
      <ol className="space-y-0">
        {articles.slice(0, 10).map((article, index) => (
          <li
            key={article.id}
            className="group py-3 border-b border-border last:border-0"
          >
            <Link to={`/article/${article.slug}`} className="flex items-start gap-3">
              {/* Rank number */}
              <span className="flex-shrink-0 font-serif text-2xl font-bold text-muted-foreground/50 w-6 leading-none">
                {index + 1}
              </span>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className="label text-[10px] text-muted-foreground">{article.section}</span>
                <h3 className="font-serif text-sm font-semibold leading-snug text-balance group-hover:opacity-80 transition-opacity line-clamp-3 mt-0.5">
                  {article.headline}
                </h3>
                <span className="timestamp text-xs mt-1 block">{formatTimestamp(article.publishedAt)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
