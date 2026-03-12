import { ReactNode } from "react";
import { Masthead } from "./Masthead";
import { Footer } from "./Footer";
import { SkipLink } from "./SkipLink";
import { BreakingNewsTicker } from "./BreakingNewsTicker";

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
      <Footer />
    </div>
  );
}
