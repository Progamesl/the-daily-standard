import { Layout } from "@/components/layout/Layout";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { OctoBlock } from "@/components/games/OctoBlock";

export default function GamesPage() {
  return (
    <Layout>
      <DocumentHead title="Octo-Block - The Octagon" />
      <div className="min-h-screen bg-[#fafaf8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <OctoBlock />
        </div>
      </div>
    </Layout>
  );
}
