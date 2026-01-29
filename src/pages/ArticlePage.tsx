import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StoryCard } from "@/components/stories/StoryCard";
import { MostPopular } from "@/components/stories/MostPopular";
import {
  getArticleBySlug,
  getMostPopular,
  getArticlesBySection,
  formatDate,
  Article,
} from "@/data/seedData";
import { ArrowLeft, Share2, Bookmark, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;
  const mostPopular = getMostPopular(5);

  if (!article) {
    return (
      <Layout>
        <div className="container-newspaper py-16 text-center">
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

  // Split body into paragraphs
  const paragraphs = article.body.split("\n\n").filter((p) => p.trim());

  return (
    <Layout>
      <article className="animate-fade-in">
        {/* Article Header */}
        <header className="container-newspaper py-8 md:py-12">
          <div className="max-w-3xl mx-auto">
            {/* Section label */}
            <div className="mb-4">
              <Link
                to={`/section/${article.section}`}
                className="label text-accent hover:opacity-80 transition-opacity"
              >
                {article.section}
              </Link>
            </div>

            {/* Headline */}
            <h1 className="headline-xl mb-4 text-balance">{article.headline}</h1>

            {/* Dek */}
            <p className="dek mb-6 text-balance">{article.dek}</p>

            {/* Byline and meta */}
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

            {/* Share actions */}
            <div className="flex items-center gap-2 py-3">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Bookmark className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comment
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Image */}
        <figure className="container-newspaper mb-8 md:mb-12">
          <div className="max-w-4xl mx-auto">
            <img
              src={article.image}
              alt={article.imageCaption}
              className="w-full aspect-[16/10] object-cover"
              loading="eager"
            />
            <figcaption className="caption mt-3 max-w-3xl mx-auto">
              {article.imageCaption}
            </figcaption>
          </div>
        </figure>

        {/* Article Body */}
        <div className="container-newspaper">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main content */}
            <div className="lg:col-span-8 xl:col-span-7 lg:col-start-1 xl:col-start-2">
              <div className="article-body max-w-none">
                {paragraphs.map((paragraph, index) => {
                  // Insert a pull quote after the 3rd paragraph
                  if (index === 3) {
                    return (
                      <div key={index}>
                        <p>{paragraph}</p>
                        <blockquote className="pull-quote">
                          "This is the moment the world chose its future. Today, we have shown that when humanity works together, no challenge is insurmountable."
                        </blockquote>
                      </div>
                    );
                  }
                  return <p key={index}>{paragraph}</p>;
                })}
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
              <div className="mt-8 p-6 bg-muted">
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

            {/* Sidebar */}
            <aside className="lg:col-span-4 xl:col-span-3 lg:col-start-9 xl:col-start-10">
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
