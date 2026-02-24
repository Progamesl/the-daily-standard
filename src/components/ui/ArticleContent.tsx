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

  useEffect(() => {
    if (!containerRef.current) return;

    let cleaned = html;

    // Strip WordPress comments and classes
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
    cleaned = cleaned.replace(/\s*class=["'][^"']*wp-[^"']*["']/gi, "");

    // Add lazy loading to all images
    cleaned = cleaned.replace(
      /<img([^>]*?)>/gi,
      (match, attrs) => {
        let newAttrs = attrs;
        if (!attrs.includes("loading")) newAttrs += ' loading="lazy"';
        if (!attrs.includes("decoding")) newAttrs += ' decoding="async"';
        if (!attrs.includes("referrerpolicy")) newAttrs += ' referrerpolicy="no-referrer"';
        return `<img${newAttrs}>`;
      }
    );

    containerRef.current.innerHTML = cleaned;

    // On error: remove image (or its parent figure). No placeholder.
    const images = containerRef.current.querySelectorAll("img");
    const handlers = new Map<HTMLImageElement, () => void>();
    images.forEach((img) => {
      const handleError = () => {
        const fig = img.closest("figure");
        if (fig) fig.remove();
        else img.remove();
      };
      img.addEventListener("error", handleError);
      handlers.set(img, handleError);
    });

    // External links open in new tab
    const links = containerRef.current.querySelectorAll("a[href]");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });

    return () => {
      handlers.forEach((handler, img) => img.removeEventListener("error", handler));
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`article-body prose prose-lg max-w-none ${className}`}
      style={{ color: '#334155', opacity: 1 }}
    />
  );
}
