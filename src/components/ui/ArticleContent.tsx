import { useEffect, useRef, useMemo } from "react";

interface ArticleContentProps {
  html: string;
  className?: string;
}

/**
 * Renders article body HTML. Keeps all images (publication + Google Docs embeds);
 * hides broken ones on error. No placeholder boxes.
 */
export function ArticleContent({ html, className = "" }: ArticleContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract font size from className
  const fontSizeStyle: { fontSize?: string; lineHeight?: number } = {};
  if (className.includes('text-xl')) {
    fontSizeStyle.fontSize = '1.25rem';
    fontSizeStyle.lineHeight = 1.9;
  } else if (className.includes('text-lg')) {
    fontSizeStyle.fontSize = '1.125rem';
    fontSizeStyle.lineHeight = 1.85;
  } else {
    fontSizeStyle.fontSize = '1rem';
    fontSizeStyle.lineHeight = 1.8;
  }

  // Clean and enhance the HTML once before rendering
  const cleaned = useMemo(() => {
    let result = (html || "").trim();
    
    // Normalize HTML to prevent flickering when background data is slightly different
    result = result
      .replace(/&nbsp;/g, " ") // Normalize non-breaking spaces
      .replace(/\s+/g, " ") // Normalize multiple spaces
      .replace(/>\s+</g, "><") // Normalize whitespace between tags
      .trim();

    // If it's just empty paragraphs or whitespace, treat as empty
    if (!result.replace(/<[^>]*>/g, "").trim() && !result.includes("<img")) {
      return "";
    }

    return result
      .replace(/<!--[\s\S]*?-->/g, "") // Strip WP/GDocs comments
      .replace(/\s*class=["'][^"']*wp-[^"']*["']/gi, "") // Strip WP classes
      .replace(/<meta[^>]*>/gi, "") // Strip meta tags
      .replace(/<img([^>]*?)>/gi, (match, attrs) => {
        let newAttrs = attrs;
        if (!attrs.includes("loading")) newAttrs += ' loading="lazy"';
        if (!attrs.includes("decoding")) newAttrs += ' decoding="async"';
        if (!attrs.includes("referrerpolicy")) newAttrs += ' referrerpolicy="no-referrer"';
        return `<img${newAttrs}>`;
      })
      .replace(/(<p[^>]*>)(\s*)([A-Za-z])/, (match, pTag, whitespace, firstLetter, offset, fullString) => {
        if (fullString.indexOf('<p') === offset) {
          return `${pTag}${whitespace}<span class="drop-cap">${firstLetter}</span>`;
        }
        return match;
      });
  }, [html]);

  useEffect(() => {
    if (!containerRef.current || !cleaned) return;

    const links = containerRef.current.querySelectorAll("a[href]");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    const images = containerRef.current.querySelectorAll("img");
    images.forEach((img) => {
      img.onerror = () => {
        const fig = img.closest("figure");
        if (fig) fig.remove();
        else img.remove();
      };
    });
  }, [cleaned]);

  if (!cleaned) {
    return (
      <div className="py-12 text-center text-muted-foreground font-serif italic border-y border-border/20">
        Article content is being updated or is temporarily unavailable.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`article-body prose prose-lg max-w-none ap-style ${className}`}
      style={{ ...fontSizeStyle, color: 'hsl(var(--foreground))', minHeight: '100px' }}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
}
