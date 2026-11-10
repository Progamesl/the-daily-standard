import { ReactNode } from "react";
import { Masthead } from "./Masthead";
import { Footer } from "./Footer";
import { SkipLink } from "./SkipLink";
import { BreakingNewsTicker } from "./BreakingNewsTicker";
import { AdSlot } from "@/components/ads/AdSlot";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <SkipLink />
      <Masthead />
      <BreakingNewsTicker />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      {/* The leaderboard placement on the admin Ads page: one banner on every
          public page. Renders nothing while no leaderboard ad is live. */}
      <AdSlot placement="leaderboard" className="flow-container py-6 sm:py-8 border-t border-border" />
      <Footer />
    </div>
  );
}
