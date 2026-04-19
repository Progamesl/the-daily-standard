import { useEffect, useRef } from "react";

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

  // Clean and enhance the HTML once before rendering
  const cleaned = (html || "")
    .replace(/<!--[\s\S]*?-->/g, "") // Strip WP/GDocs comments
    .replace(/\s*class=["'][^"']*wp-[^"']*["']/gi, "") // Strip WP classes
    .replace(/<meta[^>]*>/gi, "") // Strip meta tags
    .replace(/<img([^>]*?)>/gi, (match, attrs) => {
      // Add lazy loading and other optimizations to images
      let newAttrs = attrs;
      if (!attrs.includes("loading")) newAttrs += ' loading="lazy"';
      if (!attrs.includes("decoding")) newAttrs += ' decoding="async"';
      if (!attrs.includes("referrerpolicy")) newAttrs += ' referrerpolicy="no-referrer"';
      return `<img${newAttrs}>`;
    })
    .replace(/(<p[^>]*>)(\s*)([A-Za-z])/, (match, pTag, whitespace, firstLetter, offset, fullString) => {
      // Add drop cap to first paragraph (first letter only)
      // Only apply if this is the first paragraph in the body
      if (fullString.indexOf('<p') === offset) {
        return `${pTag}${whitespace}<span class="drop-cap">${firstLetter}</span>`;
      }
      return match;
    });

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

  // Handle external links and image errors after mounting/update
  useEffect(() => {
    if (!containerRef.current) return;

    // External links open in new tab
    const links = containerRef.current.querySelectorAll("a[href]");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    // Image error handling
    const images = containerRef.current.querySelectorAll("img");
    images.forEach((img) => {
      img.onerror = () => {
        const fig = img.closest("figure");
        if (fig) fig.remove();
        else img.remove();
      };
    });
  }, [cleaned]);

  return (
    <div
      ref={containerRef}
      className={`article-body prose prose-lg max-w-none ap-style ${className}`}
      style={{ ...fontSizeStyle, color: 'hsl(var(--foreground))' }}
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
}
