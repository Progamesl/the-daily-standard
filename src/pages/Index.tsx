import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { NewsletterStrip } from "@/components/newsletter/NewsletterStrip";
import { MostPopular } from "@/components/stories/MostPopular";
import {
  formatTimestamp,
  Article,
  getSectionBySlug,
} from "@/data/seedData";
import {
  getFeaturedPublicArticle,
  getMostPopularPublic,
  getPublicArticlesBySection,
  getLatestPublicArticles,
  getBreakingPublicNews,
  getEditorsPicksPublic,
  getLongReadPublicArticles,
} from "@/lib/publicDataService";
import { getImageOrNull, enhanceArticleImage, SITE_PLACEHOLDER } from "@/lib/imageHelpers";
import { SmartImage } from "@/components/ui/SmartImage";
import { useDataSync } from "@/contexts/DataSyncContext";
import { bylineText } from "@/lib/coAuthors";

/** Only keep articles that have a real image (not null/empty/placeholder). */
function withImages(list: Article[]): Article[] {
  return list.filter((a) => getImageOrNull(a.image, a.images) != null);
}

/** Get image URL for an article; guaranteed non-null since we pre-filtered. */
function imgSrc(a: Article): string {
  return getImageOrNull(a.image, a.images) ?? SITE_PLACEHOLDER;
}

const Index = () => {
  // Subscribe to Supabase sync — re-renders automatically when fresh data arrives
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { syncVersion } = useDataSync();

  const featured = getFeaturedPublicArticle();
  const latest = getLatestPublicArticles(1)[0];
  const breakingNews = getBreakingPublicNews(3);
  // Ask for far more candidates than each rail shows. Every rail draws from the
  // same recent stories and no story may appear twice on the page, so a rail
  // that asks for exactly five finds them already taken by the hero above it —
  // Editors' Picks was rendering a single card for that reason.
  const editorsPicksRaw = getEditorsPicksPublic(40);
  const mostPopular = getMostPopularPublic(10);

  // Global dedup tracker — no story appears more than once on the homepage
  const usedIds = new Set<string>();
  function take(pool: Article[], count: number): Article[] {
    const result: Article[] = [];
    for (const a of pool) {
      if (result.length >= count) break;
      if (usedIds.has(a.id)) continue;
      result.push(a);
      usedIds.add(a.id);
    }
    return result;
  }

  // The prominent slots draw from a wide pool rather than the most recent
  // twelve. A story with no artwork still belongs on the site, but leading with
  // one leaves a hole where the picture should be — and when most of the newest
  // stories lack images, a twelve-deep pool runs out and the front page falls
  // back to whatever is left instead of the best recent story that has a photo.
  const recentPool = getLatestPublicArticles(48);

  // Hero: the front page leads on reporting, not on a review.
  //
  // "BULLY Review" over a photograph of a metal grate is not a front page. A
  // review is service journalism — it belongs in Arts, and it reads as filler
  // in the biggest slot on the site. So reviews sort to the back of the lead
  // pool and only take the top spot when nothing else is available. An editor
  // who wants one leading can still say so with Featured on Homepage, which is
  // checked before any of this.
  const isReview = (a: Article) =>
    /\breviews?\b/i.test(a.headline) || /^(top|best) \d+/i.test(a.headline);
  const leadCandidates = withImages([featured, latest, ...recentPool].filter(Boolean) as Article[]);
  const leadPool = [
    ...leadCandidates.filter((a) => !isReview(a)),
    ...leadCandidates.filter(isReview),
  ];
  const [leadArticle] = take(leadPool, 1);

  // Secondary hero: 2 cards
  const secondaryHeroPool = withImages(recentPool);
  const secondaryHero = take(secondaryHeroPool, 2);

  // Editors' picks: up to 5
  const editorsPicks = take(withImages(editorsPicksRaw), 5);

  // Today's mix: up to 6
  const mixPool = withImages(recentPool);
  const mixStories = take(mixPool, 6);

  // Section pools — all pre-filtered for images, matching the 5 real Octagon sections
  const newsArticles = take(withImages(getPublicArticlesBySection("us")), 5);
  const artsArticles = take(withImages(getPublicArticlesBySection("arts")), 4);
  const sportsArticles = take(withImages(getPublicArticlesBySection("sports")), 4);
  const opinionArticles = take(withImages(getPublicArticlesBySection("opinion")), 6);
  const editorialArticles = take(withImages(getPublicArticlesBySection("editorial")), 3);

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
                    <Link key={article.id} to={`/article/${article.slug}`} className="text-sm font-medium hover:underline underline-offset-2">
                      {article.headline}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Hero – cinematic 2.35:1 */}
        {leadArticle && (
          <section className="w-full relative overflow-hidden" aria-label="Hero">
            <Link to={`/article/${leadArticle.slug}`} className="block group cursor-pointer">
              {/* 21:9 on a phone is a ~177px letterbox: object-cover crops the
                  photo to a slice and the headline alone nearly fills it. Give
                  mobile a portrait-ish frame and save the cinematic ratio for
                  wide screens, where it has the height to work. */}
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.35/1] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                {/* Never upscale: a sub-1200px archive image stretched across a
                    full-bleed hero is a 2-4x blow-up and looks broken. */}
                <SmartImage
                  src={imgSrc(leadArticle)}
                  alt={leadArticle.headline}
                  loading="eager"
                  minWidthForCover={1400}
                  className="transition-transform duration-[2800ms] ease-out group-hover:scale-[1.06]"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                {/* Gradient overlays for text readability - balanced to preserve image visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/75" />
                {/* Subtle dark overlay at bottom for text area only */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/65 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 md:p-10 lg:p-12 xl:p-16">
                  <div className="flow-container">
                    <div className="max-w-4xl">
                      <span className="inline-flex items-center text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/90 mb-2 sm:mb-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                        {getSectionBySlug(leadArticle.section)?.name ?? leadArticle.section}
                      </span>
                      <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-bold leading-[1.1] mb-3 sm:mb-4 text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] tracking-tight">
                        {leadArticle.headline}
                      </h1>
                      {/* Was `hidden xs:block` — `xs` is not a breakpoint in
                          tailwind.config.ts, so Tailwind never emitted the
                          variant and this summary was invisible at every size. */}
                      <p className="font-serif text-sm sm:text-lg md:text-xl lg:text-2xl text-white mb-3 sm:mb-5 line-clamp-2 leading-relaxed max-w-3xl font-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                        {leadArticle.dek}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                        <span className="font-medium">{bylineText(leadArticle)}</span>
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
          </section>
        )}

        {/* Secondary hero – 2 cards */}
        {secondaryHero.length >= 2 && (
          <section className="w-full bg-background border-b border-border py-8 sm:py-14 lg:py-16" aria-label="Featured">
            <div className="flow-container">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                {secondaryHero.map((article) => (
                  <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                    <article className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-flow bg-card">
                      <figure className="relative aspect-[3/2] overflow-hidden">
                        <img
                          src={imgSrc(article)}
                          alt={article.headline}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="eager"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        {/* Gradient overlay for text readability - lighter to preserve image visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent" />
                        {/* Subtle dark overlay at bottom for text area only */}
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/85 via-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 text-white z-10">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white mb-1.5 block drop-shadow-lg">
                            {getSectionBySlug(article.section)?.name ?? article.section}
                          </span>
                          <h2 className="font-serif text-xl md:text-2xl lg:text-3xl font-bold leading-tight mb-2 line-clamp-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] text-white">
                            {article.headline}
                          </h2>
                          <p className="text-sm text-white mb-2 line-clamp-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">{article.dek}</p>
                          <div className="flex items-center gap-2.5 text-xs text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                            <span>{bylineText(article)}</span>
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

        {/* Editors' Picks */}
        {editorsPicks.length > 0 && (
          <section className="w-full bg-background border-b border-border py-8 sm:py-10 lg:py-12" aria-label="Editors' Picks">
            <div className="flow-container">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">Editors&apos; Picks</h2>
                <Link to="/section/us" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">See All →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 lg:gap-6">
                {editorsPicks.map((article) => (
                  <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                    <article className="h-full flex flex-col bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-flow border border-border/50">
                      <figure className="relative aspect-[3/2] overflow-hidden bg-muted flex-shrink-0">
                        <img src={imgSrc(article)} alt={article.headline} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        <div className="absolute top-2 left-2">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">{article.section}</span>
                        </div>
                      </figure>
                      <div className="p-3 md:p-4 flex-1 flex flex-col">
                        <h3 className="font-serif text-base font-bold leading-tight mb-1 line-clamp-2 group-hover:text-accent transition-colors">{article.headline}</h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
                          <span>{bylineText(article)}</span>
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

        {/* Today's Mix */}
        {mixStories.length >= 3 && (
          <section className="w-full bg-background border-b border-border py-8 sm:py-14 lg:py-16" aria-label="Latest">
            <div className="flow-container">
              <div className="flex items-center justify-between mb-5 sm:mb-8">
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">Today&apos;s Mix</h2>
                <Link to="/section/us" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">View All →</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {mixStories.map((article) => (
                  <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                    <article className="h-full flex flex-col bg-card rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-flow border border-border/50 hover:border-border">
                      <figure className="relative aspect-[3/2] overflow-hidden bg-muted flex-shrink-0">
                        <img src={imgSrc(article)} alt={article.headline} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-115" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-3 left-3">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 bg-background/95 backdrop-blur-md rounded text-accent">{article.section}</span>
                        </div>
                      </figure>
                      <div className="p-4 md:p-5 flex-1 flex flex-col">
                        <h3 className="font-serif text-lg md:text-xl font-bold leading-tight mb-2 line-clamp-2 group-hover:text-accent transition-colors">{article.headline}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1 leading-relaxed">{article.dek}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/50">
                          <span className="font-medium">{bylineText(article)}</span>
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

        {/* Main content – 8/4 grid */}
        <section className="w-full bg-background py-8 sm:py-14 lg:py-16" aria-label="Sections">
          <div className="flow-container">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-8 space-y-10 sm:space-y-16">
                {/* News */}
                {newsArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">News</h2>
                      <Link to="/section/us" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">See All →</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                      {newsArticles.map((article, idx) => (
                        <div key={article.id} className={idx === 0 ? "md:col-span-2" : ""}>
                          <Link to={`/article/${article.slug}`} className="group block">
                            <article className="card-editorial rounded-xl overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow">
                              <figure className={`${idx === 0 ? 'aspect-[2.35/1]' : 'aspect-[3/2]'} overflow-hidden bg-muted relative`}>
                                <img src={imgSrc(article)} alt={article.headline} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading={idx === 0 ? "eager" : "lazy"} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                <div className="absolute top-3 left-3">
                                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">News</span>
                                </div>
                              </figure>
                              <div className="p-4 md:p-5 flex-1 flex flex-col">
                                <h3 className={`${idx === 0 ? 'headline-lg' : 'headline-md'} font-serif font-bold mb-2 ${idx === 0 ? 'line-clamp-3' : 'line-clamp-2'} group-hover:text-accent transition-colors`}>{article.headline}</h3>
                                {idx === 0 && <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{article.dek}</p>}
                                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2.5 border-t border-border/50">
                                  <span className="font-medium">{bylineText(article)}</span>
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

                {/* Arts */}
                {artsArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">Arts</h2>
                      <Link to="/section/arts" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">See All →</Link>
                    </div>
                    <div className="space-y-5">
                      {artsArticles.map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group flex gap-4">
                          <figure className="flex-shrink-0 w-36 h-28 rounded-xl overflow-hidden bg-muted shadow-md">
                            <img src={imgSrc(article)} alt={article.headline} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          </figure>
                          <div className="flex-1 min-w-0">
                            <span className="label text-[10px] text-accent uppercase tracking-widest font-bold">Arts</span>
                            <h3 className="headline-sm font-serif font-bold mt-1 line-clamp-2 group-hover:text-accent transition-colors">{article.headline}</h3>
                            <span className="timestamp text-xs mt-2 block">{formatTimestamp(article.publishedAt)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sports */}
                {sportsArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">Sports</h2>
                      <Link to="/section/sports" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">See All →</Link>
                    </div>
                    <div className="space-y-4">
                      {sportsArticles.map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group flex gap-3">
                          <figure className="flex-shrink-0 w-28 rounded-lg overflow-hidden bg-muted shadow-sm aspect-[4/3]">
                            <img src={imgSrc(article)} alt={article.headline} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          </figure>
                          <div className="flex-1 min-w-0">
                            <span className="label text-[10px] text-accent uppercase tracking-widest font-bold">Sports</span>
                            <h3 className="headline-sm font-serif font-bold mt-1 line-clamp-2 group-hover:text-accent transition-colors">{article.headline}</h3>
                            <span className="timestamp text-xs mt-2 block">{formatTimestamp(article.publishedAt)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newsletter */}
                <div className="py-10 lg:py-12">
                  <NewsletterStrip />
                </div>

                {/* Opinion */}
                {opinionArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">Opinion</h2>
                      <Link to="/section/opinion" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">See All →</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                      {opinionArticles.map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                          <article className="card-editorial rounded-xl overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow">
                            <figure className="aspect-[3/2] overflow-hidden bg-muted relative">
                              <img src={imgSrc(article)} alt={article.headline} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              <div className="absolute top-3 left-3">
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">Opinion</span>
                              </div>
                            </figure>
                            <div className="p-4 md:p-5 flex-1 flex flex-col">
                              <h3 className="headline-md font-serif font-bold mb-2 line-clamp-2 group-hover:text-accent transition-colors">{article.headline}</h3>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
                                <span className="font-medium">{bylineText(article)}</span>
                                <span>{formatTimestamp(article.publishedAt)}</span>
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Editorial */}
                {editorialArticles.length > 0 && (
                  <div className="section-divider">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">Editorial</h2>
                      <Link to="/section/editorial" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">See All →</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
                      {editorialArticles.map((article) => (
                        <Link key={article.id} to={`/article/${article.slug}`} className="group block">
                          <article className="card-editorial rounded-xl overflow-hidden bg-card h-full flex flex-col shadow-md hover:shadow-lg transition-flow border border-border/50">
                            <figure className="aspect-[3/2] overflow-hidden bg-muted relative">
                              <img src={imgSrc(article)} alt={article.headline} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              <div className="absolute top-3 left-3">
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-accent">Editorial</span>
                              </div>
                            </figure>
                            <div className="p-4 md:p-5 flex-1 flex flex-col">
                              <h3 className="headline-md font-serif font-bold mb-2 line-clamp-2 group-hover:text-accent transition-colors">{article.headline}</h3>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
                                <span className="font-medium">{bylineText(article)}</span>
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
