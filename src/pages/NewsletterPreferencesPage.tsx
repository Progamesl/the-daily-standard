import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { sections } from "@/data/seedData";
import {
  getNewsletterPrefs,
  setNewsletterPrefs,
  type NewsletterFrequency,
  type NewsletterPrefs,
} from "@/lib/newsletterStorage";

export default function NewsletterPreferencesPage() {
  const [prefs, setPrefs] = useState<NewsletterPrefs | null>(null);
  const [frequency, setFrequency] = useState<NewsletterFrequency>("daily");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const data = getNewsletterPrefs();
    setPrefs(data);
    if (data) {
      setFrequency(data.frequency);
      setSelectedSections(data.sections.length > 0 ? data.sections : sections.map((s) => s.slug));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefs) return;
    setNewsletterPrefs({
      ...prefs,
      frequency,
      sections: selectedSections,
    });
    setSaved(true);
  };

  const toggleSection = (slug: string) => {
    setSelectedSections((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  if (prefs === null) {
    return (
      <Layout>
        <DocumentHead title="Newsletter preferences" description="Manage your Octagon newsletter preferences." />
        <div className="flow-container py-16 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Newsletter preferences</h1>
          <p className="text-muted-foreground mb-6">
            You haven't subscribed yet. Sign up on the homepage or in the footer to set your preferences.
          </p>
          <Link to="/">
            <Button variant="default">Go to homepage</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <DocumentHead title="Newsletter preferences" description="Manage your Octagon newsletter preferences." />
      <div className="flow-container py-12 md:py-16">
        <div className="max-w-xl mx-auto">
          <h1 className="font-serif text-3xl font-bold mb-2">Newsletter preferences</h1>
          <p className="text-muted-foreground mb-8">{prefs.email}</p>

          {saved && (
            <p className="mb-6 p-4 bg-primary/10 text-foreground rounded-lg text-sm" role="status">
              Preferences saved.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <Label className="text-base font-medium">Frequency</Label>
              <RadioGroup
                value={frequency}
                onValueChange={(v) => setFrequency(v as NewsletterFrequency)}
                className="mt-2 flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="pref-daily" />
                  <Label htmlFor="pref-daily" className="font-normal cursor-pointer">
                    Daily
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="pref-weekly" />
                  <Label htmlFor="pref-weekly" className="font-normal cursor-pointer">
                    Weekly digest
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label className="text-base font-medium">Sections to include</Label>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sections.map((s) => (
                  <div key={s.slug} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pref-section-${s.slug}`}
                      checked={selectedSections.includes(s.slug)}
                      onCheckedChange={() => toggleSection(s.slug)}
                    />
                    <Label
                      htmlFor={`pref-section-${s.slug}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {s.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit">Save preferences</Button>
              <Link to="/">
                <Button type="button" variant="outline">
                  Back to home
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
