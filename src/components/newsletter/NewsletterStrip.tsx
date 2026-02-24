import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const SUB_KEY = "octagon-newsletter-sub";

interface NewsletterStripProps {
  className?: string;
}

export function NewsletterStrip({ className }: NewsletterStripProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    () => localStorage.getItem(SUB_KEY) ? "success" : "idle"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setStatus("error"); return; }
    setStatus("submitting");
    await new Promise((r) => setTimeout(r, 800));
    localStorage.setItem(SUB_KEY, trimmed);
    localStorage.setItem(SUB_KEY + "-prefs", JSON.stringify({ breaking: true, daily: true }));
    setStatus("success");
  };

  return (
    <section className={cn("bg-muted/50 py-10 md:py-12 rounded-xl border border-border shadow-sm", className)} aria-labelledby="newsletter-heading">
      <div className="flow-container">
        <div className="max-w-2xl mx-auto text-center">
          {status === "success" ? (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-serif text-xl font-bold">You're subscribed!</h3>
              <p className="text-muted-foreground text-sm">
                We'll deliver the best stories to your inbox.
              </p>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4">
                <Mail className="h-3 w-3" />Free newsletter
              </div>
              <h2 id="newsletter-heading" className="font-serif text-xl md:text-2xl font-bold mb-2">
                The Morning Briefing
              </h2>
              <p className="text-muted-foreground mb-6">
                Get the day's top stories delivered to your inbox every morning.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                  required
                  className={cn("flex-1 h-11 bg-background", status === "error" && "border-red-400")}
                  aria-label="Email address"
                />
                <Button type="submit" variant="default" className="h-11 font-semibold px-6" disabled={status === "submitting"}>
                  {status === "submitting" ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />...</span>
                  ) : "Subscribe"}
                </Button>
              </form>
              {status === "error" && <p className="text-xs text-red-500 mt-2">Please enter a valid email.</p>}
              <p className="text-xs text-muted-foreground mt-3">No spam. Unsubscribe anytime.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
