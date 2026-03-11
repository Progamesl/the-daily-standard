import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StoryCard } from "@/components/stories/StoryCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { getPublicAuthorById, getAllPublicArticles } from "@/lib/publicDataService";
import { ArrowLeft, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthorPage() {
  const { id } = useParams<{ id: string }>();
  const author = id ? getPublicAuthorById(id) : undefined;
  const authorArticles = getAllPublicArticles().filter((a) => a.author.id === id);

  if (!author) {
    return (
      <Layout>
        <div className="flow-container py-16 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Author Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The author you're looking for doesn't exist.
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

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: author.name },
  ];

  return (
    <Layout>
      <DocumentHead title={author.name} description={author.bio} />
      <div className="flow-container py-8 md:py-12 animate-fade-in">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        {/* Author Header */}
        <header className="max-w-3xl mx-auto text-center mb-12">
          <img
            src={author.image || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDipdfJoNun68DCzbb0IGCbIZOjiBu7a7URg&s"}
            alt={author.name}
            className="w-32 h-32 rounded-full object-cover mx-auto mb-6"
          />
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">{author.name}</h1>
          <p className="text-muted-foreground mb-4">{author.role}</p>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">{author.bio}</p>
          {author.twitter && (
            <a
              href={`https://twitter.com/${author.twitter.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-4 w-4" />
              {author.twitter}
            </a>
          )}
        </header>

        {/* Author Articles */}
        <section>
          <div className="rule-double pt-4 mb-8">
            <h2 className="font-serif text-xl font-bold">
              Articles by {author.name}
            </h2>
          </div>

          {authorArticles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No articles found for this author.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {authorArticles.map((article) => (
                <StoryCard
                  key={article.id}
                  article={article}
                  variant="standard"
                  showDek={false}
                  showByline={false}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
