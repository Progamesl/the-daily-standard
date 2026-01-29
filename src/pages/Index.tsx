import { Layout } from "@/components/layout/Layout";
import { StoryCard } from "@/components/stories/StoryCard";
import { SectionBlock } from "@/components/stories/SectionBlock";
import { MostPopular } from "@/components/stories/MostPopular";
import { TopStories } from "@/components/stories/TopStories";
import { NewsletterStrip } from "@/components/newsletter/NewsletterStrip";
import {
  getFeaturedArticle,
  getTopStories,
  getMostPopular,
  getArticlesBySection,
  getLatestArticles,
} from "@/data/seedData";

const Index = () => {
  const featuredArticle = getFeaturedArticle();
  const topStories = getTopStories(4);
  const mostPopular = getMostPopular(10);
  
  const businessArticles = getArticlesBySection("business");
  const techArticles = getArticlesBySection("technology");
  const scienceArticles = getArticlesBySection("science");
  const artsArticles = getArticlesBySection("arts");
  const opinionArticles = getArticlesBySection("opinion");
  const sportsArticles = getArticlesBySection("sports");

  return (
    <Layout>
      {/* Hero Section - Above the fold */}
      <section className="container-newspaper py-6 md:py-8" aria-label="Top news">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Lead Story - Primary focus */}
          <div className="lg:col-span-7 xl:col-span-8">
            {featuredArticle && (
              <StoryCard
                article={featuredArticle}
                variant="lead"
                showImage={true}
                showDek={true}
                showByline={true}
              />
            )}
          </div>

          {/* Top Stories Sidebar */}
          <div className="lg:col-span-5 xl:col-span-4 lg:border-l lg:border-border lg:pl-6">
            <TopStories articles={topStories} />
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="container-newspaper" aria-label="News sections">
        <div className="rule-double" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8">
          {/* Main Stream - Left/Center */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-0">
            {/* Business Section */}
            {businessArticles.length > 0 && (
              <SectionBlock
                title="Business"
                slug="business"
                articles={businessArticles}
                variant="default"
              />
            )}

            {/* Technology Section */}
            {techArticles.length > 0 && (
              <SectionBlock
                title="Technology"
                slug="technology"
                articles={techArticles}
                variant="wide"
              />
            )}

            {/* Science Section */}
            {scienceArticles.length > 0 && (
              <SectionBlock
                title="Science"
                slug="science"
                articles={scienceArticles}
                variant="default"
              />
            )}

            {/* Newsletter break */}
            <div className="py-8">
              <NewsletterStrip />
            </div>

            {/* Arts & Sports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {artsArticles.length > 0 && (
                <SectionBlock
                  title="Arts"
                  slug="arts"
                  articles={artsArticles}
                  variant="compact"
                />
              )}
              {sportsArticles.length > 0 && (
                <SectionBlock
                  title="Sports"
                  slug="sports"
                  articles={sportsArticles}
                  variant="compact"
                />
              )}
            </div>

            {/* Opinion Section */}
            {opinionArticles.length > 0 && (
              <SectionBlock
                title="Opinion"
                slug="opinion"
                articles={opinionArticles}
                variant="wide"
              />
            )}
          </div>

          {/* Right Rail - Most Popular */}
          <aside className="lg:col-span-4 xl:col-span-3 lg:border-l lg:border-border lg:pl-6">
            <div className="sticky top-24">
              <MostPopular articles={mostPopular} />
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
