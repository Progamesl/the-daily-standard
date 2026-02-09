import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { NewsletterStrip } from "@/components/newsletter/NewsletterStrip";
import { MostPopular } from "@/components/stories/MostPopular";
import {
  getFeaturedArticle,
  getMostPopular,
  getArticlesBySection,
  getLatestArticles,
  getBreakingNews,
  getEditorsPicks,
  getLongReadArticles,
} from "@/data/seedData";
import { formatTimestamp } from "@/data/seedData";
import { enhanceArticleImage, SITE_PLACEHOLDER } from "@/lib/imageHelpers";

const Index = () => {
  const featured = getFeaturedArticle();
  const latest = getLatestArticles(1)[0];
  const latestTwelve = getLatestArticles(12);
  const breakingNews = getBreakingNews(3);
  const editorsPicksRaw = getEditorsPicks(5);
  const longReads = getLongReadArticles(6);

  // Prefer articles that have real images (not placeholder) for hero and prominent slots
  const hasRealImage = (a: { image?: string; images?: string[]; headline?: string; section?: string; dek?: string }) =>
    enhanceArticleImage(a.image ?? "", a.headline, a.section, a.dek, a.images) !== SITE_PLACEHOLDER;
  const withImagesFirst = <T extends { id: string; image?: string; images?: string[]; headline?: string; section?: string; dek?: string }>(list: T[]) =>
    [...list].sort((a, b) => (hasRealImage(b) ? 1 : 0) - (hasRealImage(a) ? 1 : 0));

  const leadCandidates = withImagesFirst([featured, latest, ...latestTwelve].filter(Boolean) as typeof latestTwelve);
  const leadArticle = leadCandidates[0] ?? featured ?? latest;
  const mostPopular = getMostPopular(10);
  const secondaryHero = latestTwelve.filter((a) => a.id !== leadArticle?.id).slice(0, 2);
  const secondaryHeroWithImages = withImagesFirst(secondaryHero).slice(0, 2);
  const editorsPicks = withImagesFirst(editorsPicksRaw);
  const mixStories = latestTwelve.filter((a) => a.id !== leadArticle?.id && !secondaryHero.find(s => s.id === a.id)).slice(0, 6);

  const businessArticles = getArticlesBySection("business");
  const techArticles = getArticlesBySection("technology");
  const scienceArticles = getArticlesBySection("science");
  const artsArticles = getArticlesBySection("arts");
  const opinionArticles = getArticlesBySection("opinion");
  const sportsArticles = getArticlesBySection("sports");
  const usArticles = getArticlesBySection("us");

  return (
    <Layout>
      <DocumentHead title="Home" description="The Octagon – A Sacramento Country Day School Newspaper. Latest news, features, and opinion." />
      <div className="w-full bg-background">
        {/* Breaking news strip */}
        {breakingNews.length > 0 && (
          <section className="w-full bg-accent text-accent-foreground border-b border-accent/80" aria-label="Breaking news">
            <div className="flow-container py-2.5">
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0">Breaking</span>
                <div className="flex flex-wrap items-center gap-3 md:gap-6">
                  {breakingNews.map((article) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.slug}`}
                      className="text-sm font-medium hover:underline underline-offset-2"
                    >
                      {article.headline}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Hero – cinematic 2.35:1 proportion */}
        <section className="w-full relative overflow-hidden" aria-label="Hero">
          {leadArticle && (
            <Link to={`/article/${leadArticle.slug}`} className="block group cursor-pointer">
              <div className="relative w-full aspect-[21/9] sm:aspect-[2.35/1] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <img
                  src={enhanceArticleImage(leadArticle.image, leadArticle.headline, leadArticle.section, leadArticle.dek, leadArticle.images)}
                  alt={leadArticle.headline}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2800ms] ease-out group-hover:scale-[1.06]"
                  loading="eager"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/85" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16">
                  <div className="flow-container">
                    <div className="max-w-4xl">
                      <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 mb-4 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                        {leadArticle.section}
                      </span>
                      <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-bold leading-[1.08] mb-4 text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] tracking-tight">
                        {leadArticle.headline}
                      </h1>
                      <p className="font-serif text-lg md:text-xl lg:text-2xl text-white/95 mb-5 line-clamp-2 leading-relaxed max-w-3xl font-normal">
                        {leadArticle.dek}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-sm md:text-base text-white/85">
                        <span className="font-medium">{leadArticle.author.name}</span>
                        <span className="text-white/50">·</span>
                        <span>{formatTimestamp(leadArticle.publishedAt)}</span>
                        {leadArticle.readingTime && (
                          <>
                            <span className="text-white/50">·</span>
                            <span>{leadArticle.readingTime} min read</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </section>

        {/* Secondary hero – 2 cards, same rhythm */}
        {secondaryHero.length >= 2 && (
          <section className="w-full bg-background border-b border-border py-14 lg:py-16" aria-label="Featured">
            <div className="flow-container">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                {secondaryHeroWithImages.map((article) => (
                  <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                    <article className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-flow bg-card">
                      <figure className="relative aspect-[3/2] overflow-hidden">
                        <img
                          src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                          alt={article.headline}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="eager"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/45 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 text-white">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white/90 mb-1.5 block">
                            {article.section}
                          </span>
                          <h2 className="font-serif text-xl md:text-2xl lg:text-3xl font-bold leading-tight mb-2 line-clamp-3 drop-shadow-md">
                            {article.headline}
                          </h2>
                          <p className="text-sm text-white/90 mb-2 line-clamp-2">
                            {article.dek}
                          </p>
                          <div className="flex items-center gap-2.5 text-xs text-white/80">
                            <span>{article.author.name}</span>
                            <span>·</span>
                            <span>{formatTimestamp(article.publishedAt)}</span>
                          </div>
                        </div>
                      </figure>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Editors' Picks – horizontal strip */}
        {editorsPicks.length > 0 && (
          <section className="w-full bg-background border-b border-border py-10 lg:py-12" aria-label="Editors' Picks">
            <div className="flow-container">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                  Editors&apos; Picks
                </h2>
                <Link to="/section/us" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  See All →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-6">
                {editorsPicks.map((article) => (
                  <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                    <article className="h-full flex flex-col bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-flow border border-border/50">
                      <figure className="relative aspect-[3/2] overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                          alt={article.headline}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                        />
                        <div className="absolute top-2 left-2">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">
                            {article.section}
                          </span>
                        </div>
                      </figure>
                      <div className="p-3 md:p-4 flex-1 flex flex-col">
                        <h3 className="font-serif text-base font-bold leading-tight mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                          {article.headline}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
                          <span>{article.author.name}</span>
                          <span>{formatTimestamp(article.publishedAt)}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Today's Mix – 3-column grid, 3:2 cards */}
        {mixStories.length >= 6 && (
          <section className="w-full bg-background border-b border-border py-14 lg:py-16" aria-label="Latest">
            <div className="flow-container">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                  Today&apos;s Mix
                </h2>
                <Link
                  to="/section/us"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {mixStories.map((article) => (
                  <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                    <article className="h-full flex flex-col bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-flow border border-border/50 hover:border-border">
                      <figure className="relative aspect-[3/2] overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                          alt={article.headline}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-115"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-3 left-3">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 bg-background/95 backdrop-blur-md rounded text-accent">
                            {article.section}
                          </span>
                        </div>
                      </figure>
                      <div className="p-4 md:p-5 flex-1 flex flex-col">
                        <h3 className="font-serif text-lg md:text-xl font-bold leading-tight mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                          {article.headline}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1 leading-relaxed">
                          {article.dek}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/50">
                          <span className="font-medium">{article.author.name}</span>
                          <span>{formatTimestamp(article.publishedAt)}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main content – 8/4 grid, consistent rhythm */}
        <section className="w-full bg-background py-14 lg:py-16" aria-label="Sections">
          <div className="flow-container">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
              <div className="lg:col-span-8 space-y-16">
                {/* News */}
                {usArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                        News
                      </h2>
                      <Link
                        to="/section/us"
                        className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        See All →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                      {usArticles.slice(0, 5).map((article, idx) => (
                        <div key={article.id} className={idx === 0 ? "md:col-span-2" : ""}>
                          <Link to={`/article/${article.slug}`} className="group block">
                            <article className={`${idx === 0 ? 'card-editorial rounded-xl' : 'card-editorial rounded-xl'} overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow`}>
                              <figure className={`${idx === 0 ? 'aspect-[2.35/1]' : 'aspect-[3/2]'} overflow-hidden bg-muted relative`}>
                                <img
                                  src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                  alt={article.headline}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  loading={idx === 0 ? "eager" : "lazy"}
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                                />
                                <div className="absolute top-3 left-3">
                                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">
                                    {article.section}
                                  </span>
                                </div>
                              </figure>
                              <div className="p-4 md:p-5 flex-1 flex flex-col">
                                <h3 className={`${idx === 0 ? 'headline-lg' : 'headline-md'} font-serif font-bold mb-2 ${idx === 0 ? 'line-clamp-3' : 'line-clamp-2'} group-hover:text-accent transition-colors`}>
                                  {article.headline}
                                </h3>
                                {idx === 0 && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                    {article.dek}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2.5 border-t border-border/50">
                                  <span className="font-medium">{article.author.name}</span>
                                  <span>{formatTimestamp(article.publishedAt)}</span>
                                </div>
                              </div>
                            </article>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technology */}
                {techArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                        Technology
                      </h2>
                      <Link
                        to="/section/technology"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        See All →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                      {techArticles.slice(0, 6).map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                          <article className="card-editorial rounded-xl overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow">
                            <figure className="aspect-[3/2] overflow-hidden bg-muted relative">
                              <img
                                src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                alt={article.headline}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                              />
                              <div className="absolute top-3 left-3">
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">
                                  {article.section}
                                </span>
                              </div>
                            </figure>
                            <div className="p-4 md:p-5 flex-1 flex flex-col">
                              <h3 className="headline-md font-serif font-bold mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                                {article.headline}
                              </h3>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
                                <span className="font-medium">{article.author.name}</span>
                                <span>{formatTimestamp(article.publishedAt)}</span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Business */}
                {businessArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                        Business
                      </h2>
                      <Link
                        to="/section/business"
                        className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        See All →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                      {businessArticles.slice(0, 4).map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                          <article className="card-editorial rounded-xl overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow">
                            <figure className="aspect-[3/2] overflow-hidden bg-muted relative">
                              <img
                                src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                alt={article.headline}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                              />
                              <div className="absolute top-3 left-3">
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">
                                  {article.section}
                                </span>
                              </div>
                            </figure>
                            <div className="p-4 md:p-5 flex-1 flex flex-col">
                              <h3 className="headline-md font-serif font-bold mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                                {article.headline}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                {article.dek}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2.5 border-t border-border/50">
                                <span className="font-medium">{article.author.name}</span>
                                <span>{formatTimestamp(article.publishedAt)}</span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* In-Depth / Long Reads */}
                {longReads.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                        In-Depth
                      </h2>
                      <span className="text-xs text-muted-foreground">Long reads</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                      {longReads.slice(0, 6).map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                          <article className="card-editorial rounded-xl overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow border border-border/50">
                            <figure className="aspect-[3/2] overflow-hidden bg-muted relative">
                              <img
                                src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                alt={article.headline}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                              />
                              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">
                                  {article.section}
                                </span>
                                <span className="text-[10px] font-medium text-white/90 bg-black/50 px-2 py-1 rounded">
                                  {article.readingTime} min read
                                </span>
                              </div>
                            </figure>
                            <div className="p-4 md:p-5 flex-1 flex flex-col">
                              <h3 className="headline-md font-serif font-bold mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                                {article.headline}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                {article.dek}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t border-border/50">
                                <span className="font-medium">{article.author.name}</span>
                                <span>{formatTimestamp(article.publishedAt)}</span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newsletter */}
                <div className="py-10 lg:py-12">
                  <NewsletterStrip />
                </div>

                {/* Arts & Sports */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12 section-divider">
                  {artsArticles.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                          Arts
                        </h2>
                        <Link
                          to="/section/arts"
                          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                        >
                          See All →
                        </Link>
                      </div>
                      <div className="space-y-5">
                        {artsArticles.slice(0, 4).map((article) => (
                          <Link key={article.id} to={`/article/${article.slug}`} className="group flex gap-4">
                            <figure className="flex-shrink-0 w-36 h-28 rounded-xl overflow-hidden bg-muted shadow-md">
                              <img
                                src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                alt={article.headline}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                              />
                            </figure>
                            <div className="flex-1 min-w-0">
                              <span className="label text-[10px] text-accent">{article.section}</span>
                              <h3 className="headline-sm font-serif font-bold mt-1 line-clamp-2 group-hover:text-accent transition-colors">
                                {article.headline}
                              </h3>
                              <span className="timestamp text-xs mt-2 block">{formatTimestamp(article.publishedAt)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {sportsArticles.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                          Sports
                        </h2>
                        <Link
                          to="/section/sports"
                          className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                        >
                          See All →
                        </Link>
                      </div>
                      <div className="space-y-4">
                        {sportsArticles.slice(0, 4).map((article) => (
                          <Link key={article.id} to={`/article/${article.slug}`} className="group flex gap-3">
                            <figure className="flex-shrink-0 w-28 rounded-lg overflow-hidden bg-muted shadow-sm aspect-[4/3]">
                              <img
                                src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                alt={article.headline}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                              />
                            </figure>
                            <div className="flex-1 min-w-0">
                              <span className="label text-[10px] text-accent">{article.section}</span>
                              <h3 className="headline-sm font-serif font-bold mt-1 line-clamp-2 group-hover:text-accent transition-colors">
                                {article.headline}
                              </h3>
                              <span className="timestamp text-xs mt-2 block">{formatTimestamp(article.publishedAt)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Opinion */}
                {opinionArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
                        Opinion
                      </h2>
                      <Link
                        to="/section/opinion"
                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                      >
                        See All →
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                      {opinionArticles.slice(0, 6).map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                          <article className="card-editorial rounded-xl overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow">
                            <figure className="aspect-[3/2] overflow-hidden bg-muted relative">
                              <img
                                src={enhanceArticleImage(article.image, article.headline, article.section, article.dek, article.images)}
                                alt={article.headline}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = SITE_PLACEHOLDER; }}
                              />
                              <div className="absolute top-3 left-3">
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">
                                  {article.section}
                                </span>
                              </div>
                            </figure>
                            <div className="p-4 md:p-5 flex-1 flex flex-col">
                              <h3 className="headline-md font-serif font-bold mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                                {article.headline}
                              </h3>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
                                <span className="font-medium">{article.author.name}</span>
                                <span>{formatTimestamp(article.publishedAt)}</span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4 lg:border-l border-border lg:pl-8">
                <div className="sticky top-24">
                  <MostPopular articles={mostPopular} />
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
