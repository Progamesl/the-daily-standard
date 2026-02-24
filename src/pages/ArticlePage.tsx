import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StoryCard } from "@/components/stories/StoryCard";
import { MostPopular } from "@/components/stories/MostPopular";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { ArticleReadingToolbar } from "@/components/article/ArticleReadingToolbar";
import { ArticleContent } from "@/components/ui/ArticleContent";
import {
  getArticleBySlug,
  getMostPopular,
  getArticlesBySection,
  getSectionBySlug,
  formatDate,
} from "@/data/seedData";
import { getImageOrNull } from "@/lib/imageHelpers";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { addToHistory } from "@/components/user/UserMenu";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;
  const mostPopular = getMostPopular(5);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");

  useEffect(() => {
    if (slug) addToHistory(slug);
  }, [slug]);

  if (!article) {
    return (
      <Layout>
        <div className="flow-container py-16 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist or has been moved.</p>
          <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back to Home</Button></Link>
        </div>
      </Layout>
    );
  }

  const relatedArticles = getArticlesBySection(article.section)
    .filter((a) => a.id !== article.id)
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 6);

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

  return (
    <Layout>
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
              {article.section}
            </Link>
            <h1 className="headline-xl mb-4 text-balance text-slate-900">{article.headline}</h1>
            <p className="font-sans text-lg text-slate-600 mb-6 text-balance leading-relaxed">{article.dek}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm border-y border-border py-4 text-slate-700">
              <div className="flex items-center gap-3">
                <img src={article.author.image} alt={article.author.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <Link to={`/author/${article.author.id}`} className="font-medium text-slate-800 hover:text-accent transition-colors block">
                    {article.author.name}
                  </Link>
                  <span className="text-xs text-slate-500">{article.author.role}</span>
                </div>
              </div>
              <span className="text-slate-400 hidden sm:inline">|</span>
              <span className="text-slate-600 text-sm">{formatDate(article.publishedAt)}</span>
              <span className="text-slate-400 hidden sm:inline">|</span>
              <span className="text-slate-600 text-sm">{article.readingTime} min read</span>
            </div>
            <ArticleReadingToolbar
              slug={article.slug}
              headline={article.headline}
              dek={article.dek}
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
              <img
                src={heroImage}
                alt={article.imageCaption || article.headline}
                className="w-full aspect-[2.35/1] object-cover rounded-xl shadow-lg bg-slate-100"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              {article.imageCaption && (
                <figcaption className="text-sm text-slate-500 mt-3 max-w-3xl mx-auto">{article.imageCaption}</figcaption>
              )}
            </div>
          </figure>
        )}

        {/* Article Body */}
        <div className="flow-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <ArticleContent html={article.body} className={fontSizeClass} />

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="label mb-4">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 text-sm bg-muted text-slate-600 hover:bg-border transition-colors cursor-pointer rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author bio */}
              <div className="mt-8 p-6 bg-muted rounded-lg">
                <div className="flex items-start gap-4">
                  <img src={article.author.image} alt={article.author.name} className="w-16 h-16 rounded-full object-cover" loading="lazy" />
                  <div>
                    <Link to={`/author/${article.author.id}`} className="font-serif text-lg font-bold text-slate-900 hover:text-accent transition-colors">
                      {article.author.name}
                    </Link>
                    <p className="text-sm text-slate-600 mb-2">{article.author.role}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{article.author.bio}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24">
                <MostPopular articles={mostPopular} />
              </div>
            </aside>
          </div>
        </div>

        {/* Related Stories */}
        {relatedArticles.length > 0 && (
          <section className="container-newspaper py-12 mt-12 border-t border-border">
            <h2 className="font-serif text-xl font-bold mb-2">Read next</h2>
            <p className="text-sm text-muted-foreground mb-6">More in {article.section}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
