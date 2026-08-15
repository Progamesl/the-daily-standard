import { useParams, Link, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StoryCard } from "@/components/stories/StoryCard";
import { MostPopular } from "@/components/stories/MostPopular";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { ArticleReadingToolbar } from "@/components/article/ArticleReadingToolbar";
import { ArticleContent } from "@/components/ui/ArticleContent";
import {
  getSectionBySlug,
  formatDate,
} from "@/data/seedData";
import {
  getMostPopularPublic,
  getPublicArticlesBySection,
} from "@/lib/publicDataService";
import { getImageOrNull, picturesFirst } from "@/lib/imageHelpers";
import { SmartImage } from "@/components/ui/SmartImage";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { useDataSync } from "@/contexts/DataSyncContext";
import { trackArticleView } from "@/lib/analyticsService";
import { ArrowLeft, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { addToHistory } from "@/components/user/UserMenu";
import { CommentSection } from "@/components/article/CommentSection";
import { useArticleBySlug } from "@/hooks/useArticleBySlug";
import { AdSlot } from "@/components/ads/AdSlot";
import { CinematicArticle } from "@/components/ui/CinematicArticle";

export default function ArticlePage() {
  // Subscribe to Supabase sync — re-renders automatically when fresh data arrives
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { syncVersion } = useDataSync();

  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";

  const { article, loading, error } = useArticleBySlug(slug ?? undefined, isPreview);

  const mostPopular = getMostPopularPublic(5);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  /** The hero picture's width ÷ height, once it has loaded and reported it. */
  const [heroRatio, setHeroRatio] = useState<number | null>(null);

  useEffect(() => {
    if (slug && !isPreview) addToHistory(slug);
  }, [slug, isPreview]);

  // Track article view
  useEffect(() => {
    if (article && !isPreview) {
      trackArticleView(article.id, article.slug, {
        referrer: document.referrer,
      });
      
      // Track scroll depth
      let maxScroll = 0;
      const handleScroll = () => {
        const scrollPercent = Math.round(
          ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
        );
        maxScroll = Math.max(maxScroll, scrollPercent);
      };
      window.addEventListener('scroll', handleScroll);
      
      // Track reading time
      const startTime = Date.now();
      return () => {
        window.removeEventListener('scroll', handleScroll);
        const duration = (Date.now() - startTime) / 1000;
        trackArticleView(article.id, article.slug, {
          duration,
          scrollDepth: maxScroll,
        });
      };
    }
  }, [article, isPreview]);

  // When loading with Supabase we may already have partial article (headline, dek, hero). Show that and a body skeleton.
  const isPartial = article && loading && !article.body;
  if (loading && !article) {
    return (
      <Layout>
        <div className="flow-container py-16 text-center">
          <p className="text-muted-foreground">Loading article…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flow-container py-16 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-8">{error.message}</p>
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

  if (!article) {
    return (
      <Layout>
        <div className="flow-container py-16 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">
            {isPreview
              ? "This article hasn't been saved yet. Save the draft first, then preview."
              : "The article you're looking for doesn't exist or has been moved."}
          </p>
          <Link to={isPreview ? "/admin/stories" : "/"}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isPreview ? "Back to Stories" : "Back to Home"}
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const relatedArticles = picturesFirst(
    getPublicArticlesBySection(article.section).filter((a) => a.id !== article.id),
  ).slice(0, 6);

  const heroImage = getImageOrNull(article.image, article.images);
  const section = getSectionBySlug(article.section);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: section?.name ?? article.section, href: `/section/${article.section}` },
    { label: article.headline },
  ];

  const fontSizeClass =
    fontSize === "xlarge" ? "text-xl leading-[1.9]" :
    fontSize === "large" ? "text-lg leading-[1.85]" :
    "text-base leading-[1.8]";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.dek,
    image: heroImage ?? undefined,
    datePublished: article.publishedAt.toISOString(),
    dateModified: (article.updatedAt ?? article.publishedAt).toISOString(),
    author: { "@type": "Person", name: article.author.name },
    publisher: { "@type": "Organization", name: "The Octagon" },
  };

  if (article.isCinematic) {
    return (
      <div className="bg-slate-950">
        <DocumentHead
          title={article.headline}
          description={article.dek}
          image={heroImage ?? undefined}
          type="article"
          publishedTime={article.publishedAt.toISOString()}
          modifiedTime={(article.updatedAt ?? article.publishedAt).toISOString()}
          author={article.author.name}
          section={article.section}
          jsonLd={jsonLd}
        />
        {/* Preview Mode Banner for Cinematic View */}
        {isPreview && (
          <div className="fixed top-0 z-[100] w-full bg-amber-400 text-amber-950 py-2 px-4 flex items-center justify-center gap-3 shadow-lg">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest">Cinematic Preview</span>
            <EyeOff className="h-4 w-4 shrink-0" />
          </div>
        )}
        <CinematicArticle article={article} />
      </div>
    );
  }

  return (
    <Layout>
      {/* Preview mode banner */}
      {isPreview && (
        <div className="sticky top-0 z-50 w-full bg-amber-400 text-amber-950 py-2.5 px-4 flex items-center justify-center gap-3 shadow-md">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-bold uppercase tracking-widest">Preview Mode — Not Published</span>
          <span className="text-xs font-medium opacity-70 hidden sm:inline">This is how the article will look when published</span>
          <EyeOff className="h-4 w-4 shrink-0" />
        </div>
      )}
      <DocumentHead
        title={article.headline}
        description={article.dek}
        image={heroImage ?? undefined}
        type="article"
        publishedTime={article.publishedAt.toISOString()}
        modifiedTime={(article.updatedAt ?? article.publishedAt).toISOString()}
        author={article.author.name}
        section={article.section}
        jsonLd={jsonLd}
      />
      <ReadingProgress />
      <article>
        {/* Header */}
        <header className="flow-container py-8 md:py-12">
          <div className="max-w-3xl mx-auto">
            <Breadcrumbs items={breadcrumbItems} className="mb-4" />
            <Link to={`/section/${article.section}`} className="label text-accent hover:opacity-80 transition-opacity inline-block mb-4">
              {section?.name ?? article.section}
            </Link>
            <h1 className="headline-xl mb-3 sm:mb-4 text-balance text-foreground">{article.headline}</h1>
            <p className="font-sans text-base sm:text-lg text-muted-foreground mb-4 sm:mb-6 text-balance leading-relaxed">{article.dek}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm border-y border-border py-4 text-muted-foreground">
              <div className="flex items-center gap-3">
                <img 
                  src={article.author.image || "/favicon.png"} 
                  alt={article.author.name} 
                  className="w-10 h-10 rounded-full object-cover" 
                />
                <div>
                  <Link to={`/author/${article.author.id}`} className="font-medium text-foreground hover:text-accent transition-colors block">
                    {article.author.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{article.author.role}</span>
                </div>
              </div>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="text-muted-foreground text-sm">{formatDate(article.publishedAt)}</span>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="text-muted-foreground text-sm">{article.readingTime} min read</span>
            </div>
            <ArticleReadingToolbar
              slug={article.slug}
              headline={article.headline}
              dek={article.dek}
              audioUrl={article.audioUrl}
              bodyText={article.body.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}
              shareUrl={`/article/${article.slug}`}
              shareTitle={article.headline}
              shareDescription={article.dek}
              onFontSizeChange={setFontSize}
              fontSize={fontSize}
            />
          </div>
        </header>

        {/* Hero Image — only when we have a real image */}
        {heroImage && (
          <figure className="flow-container mb-8 md:mb-12">
            <div className="max-w-4xl mx-auto">
              {/* The frame takes the picture's own proportions rather than
                  forcing every hero into one letterbox. Against the fixed
                  2.35:1 frame, 44 of 45 archive images lost more than 15% of
                  themselves — a cartoon had its speech bubbles cropped off both
                  sides. Matching the shape shows the whole picture without
                  bringing back the grey bars that letterboxing produced.

                  The old frame stands in until the image reports its
                  proportions, so the page doesn't jump when it arrives, and a
                  portrait is held to 70% of the window height and centred so it
                  can't push the story off the screen. */}
              <div
                className={cn(
                  'relative mx-auto overflow-hidden rounded-lg sm:rounded-xl shadow-lg bg-slate-900',
                  (heroRatio == null || heroRatio >= 1) && 'w-full',
                  heroRatio == null && 'aspect-[16/9] sm:aspect-[2.35/1]'
                )}
                style={
                  heroRatio == null
                    ? undefined
                    : heroRatio >= 1
                      ? { aspectRatio: String(heroRatio) }
                      : { aspectRatio: String(heroRatio), height: 'min(70vh, 40rem)', width: 'auto' }
                }
              >
                <SmartImage
                  src={heroImage}
                  alt={article.imageCaption || article.headline}
                  loading="eager"
                  minWidthForCover={1100}
                  onRatio={setHeroRatio}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {article.imageCaption && (
                <figcaption className="text-sm text-muted-foreground mt-3 max-w-3xl mx-auto">{article.imageCaption}</figcaption>
              )}
            </div>
          </figure>
        )}

        {/* Article Body */}
        <div className="flow-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {isPartial ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-5/6" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-4/5" />
                </div>
              ) : (
                <ArticleContent html={article.body} className={fontSizeClass} />
              )}

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="label mb-4">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 text-sm bg-muted text-muted-foreground hover:bg-border transition-colors cursor-pointer rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author bio */}
              <div className="mt-8 p-4 sm:p-6 bg-muted rounded-lg">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 text-center sm:text-left">
                  <img 
                    src={article.author.image || "/favicon.png"} 
                    alt={article.author.name} 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover" 
                    loading="lazy" 
                  />
                  <div>
                    <Link to={`/author/${article.author.id}`} className="font-serif text-base sm:text-lg font-bold text-foreground hover:text-accent transition-colors">
                      {article.author.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mb-1 sm:mb-2">{article.author.role}</p>
                    <p className="text-sm text-muted-foreground ">{article.author.bio}</p>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <CommentSection articleId={article.id || article.slug} />
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <AdSlot placement="sidebar" />
                <MostPopular articles={mostPopular} />
                <AdSlot placement="inline" />
              </div>
            </aside>
          </div>
        </div>

        {/* Related Stories */}
        {relatedArticles.length > 0 && (
          <section className="flow-container py-8 sm:py-12 mt-8 sm:mt-12 border-t border-border">
            <h2 className="font-serif text-lg sm:text-xl font-bold mb-2">Read next</h2>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">More in {article.section}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {relatedArticles.map((rel) => (
                <StoryCard key={rel.id} article={rel} variant="standard" showDek={false} />
              ))}
            </div>
          </section>
        )}
      </article>
    </Layout>
  );
}
