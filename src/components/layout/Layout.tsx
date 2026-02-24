import { ReactNode } from "react";
import { Masthead } from "./Masthead";
import { Footer } from "./Footer";
import { SkipLink } from "./SkipLink";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <SkipLink />
      <Masthead />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
