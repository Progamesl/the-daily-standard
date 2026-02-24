import { Link } from "react-router-dom";
import { Article, formatTimestamp } from "@/data/seedData";
import { cn } from "@/lib/utils";

interface TopStoriesProps {
  articles: Article[];
  className?: string;
}

export function TopStories({ articles, className }: TopStoriesProps) {
  return (
    <aside className={cn("", className)}>
      {/* Header with rule */}
      <div className="rule-medium pt-3 mb-4">
        <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Top Stories
        </h2>
      </div>

      {/* Stories list */}
      <div className="space-y-4">
        {articles.map((article) => (
          <article key={article.id} className="group py-3 border-b border-border last:border-0">
            <Link to={`/article/${article.slug}`} className="block">
              {article.isBreaking && (
                <span className="badge-breaking text-[10px] mb-1">Live</span>
              )}
              <span className="label text-[10px] text-accent">{article.section}</span>
              <h3 className="font-serif text-base font-semibold leading-snug text-balance group-hover:opacity-80 transition-opacity mt-1 mb-2">
                {article.headline}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {article.dek}
              </p>
              <span className="timestamp text-xs">{formatTimestamp(article.publishedAt)}</span>
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
}
