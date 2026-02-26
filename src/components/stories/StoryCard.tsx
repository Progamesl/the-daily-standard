import { Link } from "react-router-dom";
import { Article, formatTimestamp } from "@/data/seedData";
import { cn } from "@/lib/utils";
import { enhanceArticleImage, SITE_PLACEHOLDER } from "@/lib/imageHelpers";

interface StoryCardProps {
  article: Article;
  variant?: "lead" | "standard" | "compact" | "list";
  showImage?: boolean;
  showDek?: boolean;
  showByline?: boolean;
  className?: string;
}

export function StoryCard({
  article,
  variant = "standard",
  showImage = true,
  showDek = true,
  showByline = true,
  className,
}: StoryCardProps) {
  const { slug, headline, dek, image, images, imageCaption, section, author, publishedAt, readingTime } = article;

  if (variant === "lead") {
    return (
      <article className={cn("group", className)}>
        <Link to={`/article/${slug}`} className="block">
          {showImage && (
            <figure className="mb-4 overflow-hidden bg-muted">
              <img
                src={enhanceArticleImage(image, headline, section, dek, images)}
                alt={imageCaption || headline}
                className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="eager"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
              />
              {imageCaption && <figcaption className="caption mt-2">{imageCaption}</figcaption>}
            </figure>
          )}
          <div className="space-y-3">
            <span className="label text-accent">{section}</span>
            <h2 className="headline-xl text-balance group-hover:opacity-80 transition-opacity">
              {headline}
            </h2>
            {showDek && <p className="dek text-balance">{dek}</p>}
            {showByline && (
              <div className="flex items-center gap-2 text-sm">
                <span className="byline">{author.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="timestamp">{formatTimestamp(publishedAt)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="timestamp">{readingTime} min read</span>
              </div>
            )}
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "standard") {
    return (
      <article className={cn("group", className)}>
        <Link to={`/article/${slug}`} className="block">
          {showImage && (
            <figure className="overflow-hidden bg-muted">
              <img
                src={enhanceArticleImage(image, headline, section, dek, images)}
                alt={imageCaption || headline}
                className="w-full aspect-[3/2] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
              />
            </figure>
          )}
          <div className="p-4 md:p-5 space-y-2">
            <span className="label text-accent">{section}</span>
            <h3 className="headline-md text-balance group-hover:text-accent transition-colors">
              {headline}
            </h3>
            {showDek && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{dek}</p>}
            {showByline && (
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="font-medium">{author.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="timestamp">{formatTimestamp(publishedAt)}</span>
              </div>
            )}
          </div>
        </Link>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={cn("group", className)}>
        <Link to={`/article/${slug}`} className="flex gap-4">
          {showImage && (
            <figure className="flex-shrink-0 w-28 h-28 md:w-32 md:h-24 rounded-lg overflow-hidden bg-muted">
              <img
                src={enhanceArticleImage(image, headline, section, dek, images)}
                alt={imageCaption || headline}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
              />
            </figure>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <span className="label text-accent text-[10px]">{section}</span>
            <h4 className="headline-sm text-balance group-hover:text-accent transition-colors line-clamp-3">
              {headline}
            </h4>
            <span className="timestamp text-xs">{formatTimestamp(publishedAt)}</span>
          </div>
        </Link>
      </article>
    );
  }

  // List variant
  return (
    <article className={cn("group py-3 border-b border-border last:border-0", className)}>
      <Link to={`/article/${slug}`} className="block">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">
            {/* Rank number will be passed via className or separate prop */}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="headline-sm text-balance group-hover:opacity-80 transition-opacity line-clamp-2">
              {headline}
            </h4>
            <span className="timestamp text-xs">{formatTimestamp(publishedAt)}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
