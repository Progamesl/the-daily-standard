import { useEffect } from "react";

const SITE_NAME = "The Octagon";
const DEFAULT_DESCRIPTION = "A Sacramento Country Day School Newspaper. Trusted journalism for our community.";

interface DocumentHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  jsonLd?: object;
}

export function DocumentHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  section,
  jsonLd,
}: DocumentHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullImage = image?.startsWith("http") ? image : image ? `${typeof window !== "undefined" ? window.location.origin : ""}${image}` : undefined;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:type", type, true);
    if (fullImage) setMeta("og:image", fullImage, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    if (fullImage) setMeta("twitter:image", fullImage);
    if (type === "article" && publishedTime) setMeta("article:published_time", publishedTime, true);
    if (type === "article" && modifiedTime) setMeta("article:modified_time", modifiedTime, true);
    if (type === "article" && author) setMeta("article:author", author, true);
    if (type === "article" && section) setMeta("article:section", section, true);
  }, [fullTitle, description, fullImage, type, publishedTime, modifiedTime, author, section]);

  useEffect(() => {
    if (!jsonLd) return;
    let script = document.querySelector('script[type="application/ld+json"]#octagon-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "octagon-jsonld";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => {
      script?.remove();
    };
  }, [jsonLd]);

  return null;
}
