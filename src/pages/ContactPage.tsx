import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Layout>
      <div className="flow-container py-12 md:py-16 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Have a question, news tip, or feedback? We'd love to hear from you.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              {submitted ? (
                <div className="bg-muted p-8 text-center">
                  <h2 className="font-serif text-xl font-bold mb-2">Thank You</h2>
                  <p className="text-muted-foreground">
                    Your message has been received. We'll get back to you soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" rows={6} required />
                  </div>

                  <Button type="submit" size="lg" className="w-full font-semibold">
                    Send Message
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-xl font-bold mb-4">Get in Touch</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a
                        href="mailto:octagon@scdsstudent.org"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        octagon@scdsstudent.org
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <a
                        href="tel:+1-212-555-0100"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        +1 (212) 555-0100
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">
                        Sacramento Country Day School
                        <br />
                        Sacramento, CA
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rule-thin pt-6">
                <h2 className="font-serif text-xl font-bold mb-4">News Tips</h2>
                <p className="text-muted-foreground mb-4">
                  Have a story we should know about? Our newsroom is always interested in hearing
                  from readers with news tips.
                </p>
                <a
                  href="mailto:octagon@scdsstudent.org"
                  className="text-foreground font-medium hover:opacity-80 transition-opacity"
                >
                  octagon@scdsstudent.org
                </a>
              </div>

              <div className="rule-thin pt-6">
                <h2 className="font-serif text-xl font-bold mb-4">Corrections</h2>
                <p className="text-muted-foreground mb-4">
                  We take accuracy seriously. If you've found an error in our reporting, please let
                  us know.
                </p>
                <a
                  href="mailto:octagon@scdsstudent.org"
                  className="text-foreground font-medium hover:opacity-80 transition-opacity"
                >
                  octagon@scdsstudent.org
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
