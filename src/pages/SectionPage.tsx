import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StoryCard } from "@/components/stories/StoryCard";
import { MostPopular } from "@/components/stories/MostPopular";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DocumentHead } from "@/components/seo/DocumentHead";
import {
  getSectionBySlug,
  sections,
} from "@/data/seedData";
import {
  getPublicArticlesBySection,
  getMostPopularPublic,
} from "@/lib/publicDataService";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDataSync } from "@/contexts/DataSyncContext";
import { getImageOrNull, picturesFirst } from "@/lib/imageHelpers";
import { TOPICS, getTopicBySlug } from "@/lib/topics";

export default function SectionPage() {
  // Subscribe to Supabase sync — re-renders automatically when fresh data arrives
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { syncVersion } = useDataSync();
  const { slug } = useParams<{ slug: string }>();
  // Topic pages (Politics, Technology…) are laid out exactly like sections;
  // getPublicArticlesBySection already knows how to fill them.
  const section = slug ? getSectionBySlug(slug) ?? getTopicBySlug(slug) : undefined;
  const articles = slug ? getPublicArticlesBySection(slug) : [];
  const mostPopular = getMostPopularPublic(5);

  if (!section) {
    return (
      <Layout>
        <div className="container-newspaper py-16 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Section Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The section you're looking for doesn't exist.
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

  // Lead with the newest story that actually has a picture. Taking whatever is
  // newest puts a bare headline in the biggest slot on the page while a story
  // with a photograph sits underneath it. Everything else keeps its date order,
  // so nothing is buried — only the lead is chosen on more than recency.
  const leadIndex = articles.findIndex((a) => getImageOrNull(a.image, a.images) != null);
  const featured = articles[leadIndex >= 0 ? leadIndex : 0];
  const rest = picturesFirst(articles.filter((_, i) => i !== (leadIndex >= 0 ? leadIndex : 0)));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: section.name },
  ];

  return (
    <Layout>
      <DocumentHead title={section.name} description={section.description} />
      <div className="flow-container py-8 md:py-12 animate-fade-in">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        {/* Section Header */}
        <header className="mb-6 sm:mb-8 md:mb-12">
          <div className="rule-double pt-4">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold mb-2">{section.name}</h1>
            <p className="text-muted-foreground">{section.description}</p>
          </div>

          {/* Subsection nav */}
          <nav className="mt-6 -mx-4 px-4 overflow-x-auto no-scrollbar" aria-label="Section navigation">
            <ul className="flex items-center gap-1.5 w-max">
              {[...sections, ...TOPICS].map((s, i) => (
                <li key={s.slug} className={i === sections.length ? "ml-1.5 pl-3 border-l border-border" : undefined}>
                  <Link
                    to={`/section/${s.slug}`}
                    className={`px-3.5 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors touch-manipulation ${
                      s.slug === slug
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted active:bg-muted"
                    }`}
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No articles found in this section.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main content */}
            <div className="lg:col-span-8 xl:col-span-9">
              {/* Featured story */}
              {featured && (
                <div className="mb-8 pb-8 border-b border-border">
                  <StoryCard
                    article={featured}
                    variant="lead"
                    showImage={true}
                    showDek={true}
                    showByline={true}
                  />
                </div>
              )}

              {/* Story grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rest.map((article) => (
                  <StoryCard
                    key={article.id}
                    article={article}
                    variant="standard"
                    showDek={true}
                    showByline={true}
                  />
                ))}
              </div>

              {rest.length > 0 && (
                <div className="text-center mt-12">
                  <Button variant="outline" className="font-semibold">
                    Load More Stories
                  </Button>
                </div>
              )}
            </div>

            {/* Right Rail */}
            <aside className="lg:col-span-4 xl:col-span-3 lg:border-l lg:border-border lg:pl-6">
              <div className="sticky top-24">
                <MostPopular articles={mostPopular} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}
