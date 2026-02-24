import { Link } from "react-router-dom";
import { Article } from "@/data/seedData";
import { StoryCard } from "./StoryCard";
import { cn } from "@/lib/utils";

interface SectionBlockProps {
  title: string;
  slug: string;
  articles: Article[];
  variant?: "default" | "wide" | "compact";
  className?: string;
}

export function SectionBlock({
  title,
  slug,
  articles,
  variant = "default",
  className,
}: SectionBlockProps) {
  if (articles.length === 0) return null;

  const [featured, ...rest] = articles;

  return (
    <section className={cn("py-8", className)} aria-labelledby={`section-${slug}`}>
      {/* Section header with double rule */}
      <div className="rule-double pt-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 id={`section-${slug}`} className="font-serif text-xl font-bold">
            {title}
          </h2>
          <Link
            to={`/section/${slug}`}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            See All →
          </Link>
        </div>
      </div>

      {variant === "wide" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.slice(0, 3).map((article) => (
            <StoryCard
              key={article.id}
              article={article}
              variant="standard"
              showDek={false}
            />
          ))}
        </div>
      ) : variant === "compact" ? (
        <div className="space-y-4">
          {articles.slice(0, 5).map((article) => (
            <StoryCard
              key={article.id}
              article={article}
              variant="compact"
              showImage={false}
              showDek={false}
              showByline={false}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Featured story */}
          <div className="md:col-span-6 lg:col-span-5">
            <StoryCard
              article={featured}
              variant="standard"
              showDek={true}
            />
          </div>

          {/* Secondary stories */}
          <div className="md:col-span-6 lg:col-span-7 md:border-l md:border-border md:pl-6">
            <div className="space-y-4">
              {rest.slice(0, 4).map((article) => (
                <StoryCard
                  key={article.id}
                  article={article}
                  variant="compact"
                  showImage={true}
                  showDek={false}
                  showByline={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
