import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StoryCard } from "@/components/stories/StoryCard";
import { MostPopular } from "@/components/stories/MostPopular";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { ArticleReadingToolbar } from "@/components/article/ArticleReadingToolbar";
import {
  getArticleBySlug,
  getMostPopular,
  getArticlesBySection,
  getSectionBySlug,
  formatDate,
} from "@/data/seedData";
import { enhanceArticleImage, SITE_PLACEHOLDER } from "@/lib/imageHelpers";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// Function to clean HTML and extract images
function parseArticleContent(content: string) {
  // Final cleanup - remove any remaining WordPress comments
  let cleaned = content.replace(/<!--[\s\S]*?-->/g, '');
  
  // Extract all images with their context
  const imageBlocks: Array<{ src: string; alt: string; caption?: string }> = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(cleaned)) !== null) {
    imageBlocks.push({
      src: match[1],
      alt: match[2] || '',
    });
  }
  
  // Remove images from content (we'll render them separately in the layout)
  cleaned = cleaned.replace(/<img[^>]*>/gi, '');
  
  // Remove any remaining WordPress-specific classes
  cleaned = cleaned.replace(/\s*class=["'][^"']*wp-[^"']*["']/gi, '');
  
  // Split content into paragraphs - handle both <p> tags and double line breaks
  const paragraphs: string[] = [];
  
  // First, split by </p> tags
  const pSplits = cleaned.split(/<\/p>/i);
  
  pSplits.forEach((chunk) => {
    // Remove opening <p> tag and clean
    let text = chunk.replace(/<p[^>]*>/gi, '').trim();
    
    // Also handle content that might be in divs
    text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '').trim();
    
    // Remove any remaining HTML tags except basic formatting (strong, em, a, etc.)
    // But keep the structure clean
    text = text.replace(/<h[1-6][^>]*>/gi, '<h2>').replace(/<\/h[1-6]>/gi, '</h2>');
    
    if (text.length > 0 && !text.match(/^<!--/)) {
      paragraphs.push(text);
    }
  });
  
  // If no paragraphs found, split by double line breaks
  if (paragraphs.length === 0) {
    const lines = cleaned.split(/\n\s*\n/);
    paragraphs.push(...lines.filter(l => l.trim().length > 0 && !l.match(/^<!--/)));
  }
  
  return { paragraphs, images: imageBlocks };
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;
  const mostPopular = getMostPopular(5);
  const [parsedContent, setParsedContent] = useState<{ paragraphs: string[]; images: Array<{ src: string; alt: string }> }>({ paragraphs: [], images: [] });
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");

  useEffect(() => {
    if (article) {
      setParsedContent(parseArticleContent(article.body));
    }
  }, [article]);

  if (!article) {
    return (
      <Layout>
        <div className="flow-container py-16 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const relatedArticles = getArticlesBySection(article.section)
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  // Get all images for the article
  const allImages = article.images && article.images.length > 0 
    ? article.images 
    : parsedContent.images.length > 0 
      ? parsedContent.images.map(img => img.src)
      : [article.image];

  const section = getSectionBySlug(article.section);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: section?.name ?? article.section, href: `/section/${article.section}` },
    { label: article.headline },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.dek,
    image: enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images),
    datePublished: article.publishedAt.toISOString(),
    dateModified: (article.updatedAt ?? article.publishedAt).toISOString(),
    author: {
      "@type": "Person",
      name: article.author.name,
      url: `${typeof window !== "undefined" ? window.location.origin : ""}/author/${article.author.id}`,
    },
    publisher: {
      "@type": "Organization",
      name: "The Octagon",
      logo: { "@type": "ImageObject", url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDipdfJoNun68DCzbb0IGCbIZOjiBu7a7URg&s" },
    },
  };

  return (
    <Layout>
      <DocumentHead
        title={article.headline}
        description={article.dek}
        image={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
        type="article"
        publishedTime={article.publishedAt.toISOString()}
        modifiedTime={(article.updatedAt ?? article.publishedAt).toISOString()}
        author={article.author.name}
        section={article.section}
        jsonLd={jsonLd}
      />
      <ReadingProgress />
      <article className="animate-fade-in">
        {/* Article Header */}
        <header className="flow-container py-8 md:py-12">
          <div className="max-w-3xl mx-auto">
            <Breadcrumbs items={breadcrumbItems} className="mb-4" />
            <Link
              to={`/section/${article.section}`}
              className="label text-accent hover:opacity-80 transition-opacity inline-block mb-4"
            >
              {article.section}
            </Link>

            <h1 className="headline-xl mb-4 text-balance">{article.headline}</h1>

            <p className="dek mb-6 text-balance">{article.dek}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm border-y border-border py-4">
              <div className="flex items-center gap-3">
                <img
                  src={article.author.image}
                  alt={article.author.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <Link
                    to={`/author/${article.author.id}`}
                    className="byline hover:opacity-80 transition-opacity block"
                  >
                    {article.author.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{article.author.role}</span>
                </div>
              </div>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="timestamp">{formatDate(article.publishedAt)}</span>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="timestamp">{article.readingTime} min read</span>
            </div>

            <ArticleReadingToolbar
              slug={article.slug}
              headline={article.headline}
              dek={article.dek}
              bodyText={parsedContent.paragraphs
                .map((p) => p.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
                .filter(Boolean)
                .join(" ")}
              shareUrl={`/article/${article.slug}`}
              shareTitle={article.headline}
              shareDescription={article.dek}
              onFontSizeChange={setFontSize}
              fontSize={fontSize}
            />
          </div>
        </header>

        {/* Hero Image */}
        <figure className="flow-container mb-8 md:mb-12">
          <div className="max-w-4xl mx-auto">
            <img
              src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
              alt={article.imageCaption || article.headline}
              className="w-full aspect-[2.35/1] object-cover rounded-xl shadow-lg"
              loading="eager"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
            />
            {article.imageCaption && (
              <figcaption className="caption mt-3 max-w-3xl mx-auto">
                {article.imageCaption}
              </figcaption>
            )}
          </div>
        </figure>

        {/* Article Body */}
        <div className="flow-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Stunning Images Gallery */}
            <aside className="lg:col-span-2 xl:col-span-2 lg:col-start-1 xl:col-start-1 hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {allImages.slice(1, Math.min(5, allImages.length)).map((imgSrc, idx) => (
                  <div 
                    key={idx} 
                    className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-accent/10 to-background"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                    <img
                      src={imgSrc}
                      alt={`${article.headline} - Image ${idx + 2}`}
                      className="w-full aspect-[4/5] object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-xs font-medium truncate">{article.headline}</p>
                    </div>
                  </div>
                ))}
                {allImages.length <= 1 && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-accent/20 via-accent/10 to-background p-8 rounded-xl border-2 border-accent/30 shadow-lg">
                      <div className="text-4xl mb-4">📰</div>
                      <h3 className="font-serif text-xl font-bold mb-2 text-foreground">The Octagon</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Your source for student journalism and community news at Sacramento Country Day School.
                      </p>
                    </div>
                    {relatedArticles.slice(0, 2).map((rel) => (
                      <Link key={rel.id} to={`/article/${rel.slug}`} className="block group">
                        <div className="overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300">
                          <img
                            src={enhanceArticleImage(rel.image, rel.headline, rel.section, rel.dek, rel.images)}
                            alt={rel.headline}
                            className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="p-3 bg-background">
                            <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-accent transition-colors">
                              {rel.headline}
                            </h4>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* Main content */}
            <div className="lg:col-span-7 xl:col-span-7 lg:col-start-3 xl:col-start-3">
              <div
                className={`article-body max-w-none prose ${fontSize === "large" ? "prose-lg text-lg" : fontSize === "xlarge" ? "prose-xl text-xl" : "prose-lg"}`}
              >
                {parsedContent.paragraphs.map((paragraph, index) => {
                  // Clean paragraph - strip HTML tags but keep text, convert links
                  let cleanText = paragraph;
                  
                  // Extract and preserve links
                  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
                  const links: Array<{ url: string; text: string }> = [];
                  let linkMatch;
                  while ((linkMatch = linkRegex.exec(paragraph)) !== null) {
                    links.push({ url: linkMatch[1], text: linkMatch[2] });
                  }
                  
                  // Remove all HTML tags, but keep text content
                  cleanText = cleanText.replace(/<[^>]+>/g, '');
                  
                  // Decode HTML entities
                  cleanText = cleanText
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                  
                  // Clean up whitespace
                  cleanText = cleanText.replace(/\s+/g, ' ').trim();
                  
                  // Skip empty paragraphs
                  if (!cleanText || cleanText.length < 10) {
                    return null;
                  }
                  
                  // Insert images between paragraphs
                  const imageIndex = Math.floor(index / 3);
                  const shouldShowImage = index > 0 && index % 3 === 0 && imageIndex < allImages.length;
                  
                  return (
                    <div key={index}>
                      <p className="mb-6 text-lg leading-relaxed text-foreground">
                        {cleanText}
                      </p>
                      {shouldShowImage && allImages[imageIndex] && (
                        <figure className="my-12">
                          <img
                            src={allImages[imageIndex]}
                            alt={`${article.headline} - Image ${imageIndex + 1}`}
                            className="w-full rounded-lg shadow-lg object-cover"
                            style={{ maxHeight: '600px', objectFit: 'cover' }}
                            loading="lazy"
                          />
                        </figure>
                      )}
                    </div>
                  );
                }).filter(Boolean)}
                
                {/* Show remaining images at the end */}
                {allImages.slice(Math.ceil(parsedContent.paragraphs.length / 3)).map((imgSrc, idx) => (
                  <figure key={`end-${idx}`} className="my-12">
                    <img
                      src={imgSrc}
                      alt={`${article.headline} - Image ${idx + Math.ceil(parsedContent.paragraphs.length / 3) + 1}`}
                      className="w-full rounded-lg shadow-lg object-cover"
                      style={{ maxHeight: '600px', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </figure>
                ))}
              </div>

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="label mb-4">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-muted text-muted-foreground hover:bg-border transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author bio */}
              <div className="mt-8 p-6 bg-muted rounded-lg">
                <div className="flex items-start gap-4">
                  <img
                    src={article.author.image}
                    alt={article.author.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <Link
                      to={`/author/${article.author.id}`}
                      className="font-serif text-lg font-bold hover:opacity-80 transition-opacity"
                    >
                      {article.author.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mb-2">{article.author.role}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.author.bio}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <aside className="lg:col-span-3 xl:col-span-3 lg:col-start-10 xl:col-start-10">
              <div className="sticky top-24">
                <MostPopular articles={mostPopular} />
              </div>
            </aside>
          </div>
        </div>

        {/* Related Stories */}
        {relatedArticles.length > 0 && (
          <section className="container-newspaper py-12 mt-12 border-t border-border">
            <h2 className="font-serif text-xl font-bold mb-6">More in {article.section}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((relatedArticle) => (
                <StoryCard
                  key={relatedArticle.id}
                  article={relatedArticle}
                  variant="standard"
                  showDek={false}
                />
              ))}
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
}
