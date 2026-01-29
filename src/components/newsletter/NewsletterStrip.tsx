import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NewsletterStripProps {
  className?: string;
}

export function NewsletterStrip({ className }: NewsletterStripProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <section className={cn("bg-muted py-10 md:py-12", className)} aria-labelledby="newsletter-heading">
      <div className="container-newspaper">
        <div className="max-w-2xl mx-auto text-center">
          {submitted ? (
            <div className="space-y-2">
              <h3 className="font-serif text-xl font-bold">Thank You</h3>
              <p className="text-muted-foreground">
                You've been added to our newsletter. Expect your first edition soon.
              </p>
            </div>
          ) : (
            <>
              <h2 id="newsletter-heading" className="font-serif text-xl md:text-2xl font-bold mb-2">
                The Morning Briefing
              </h2>
              <p className="text-muted-foreground mb-6">
                Get the day's top stories delivered to your inbox every morning.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-background border-border-strong"
                  aria-label="Email address"
                />
                <Button type="submit" variant="default" className="font-semibold">
                  Subscribe
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3">
                By subscribing, you agree to our Terms and Privacy Policy.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
