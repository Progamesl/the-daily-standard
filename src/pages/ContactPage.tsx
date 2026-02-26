import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, CheckCircle, Loader2 } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────
// TO ACTIVATE EMAIL DELIVERY:
//  1. Go to https://formspree.io and sign in with the Octagon email account.
//  2. Create a new form → it gives you a Form ID like "xyzabcde".
//  3. Replace the placeholder below with that ID.
// ──────────────────────────────────────────────────────────────────────────
const FORMSPREE_FORM_ID = "mwvnylbg";
const FORMSPREE_URL = `https://formspree.io/f/${FORMSPREE_FORM_ID}`;

type Status = "idle" | "loading" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If Formspree hasn't been configured yet, fall back to mailto
    if (FORMSPREE_FORM_ID === "YOUR_FORM_ID_HERE") {
      const form = e.currentTarget;
      const data = new FormData(form);
      const subject = encodeURIComponent(data.get("subject") as string || "Message from website");
      const body = encodeURIComponent(
        `Name: ${data.get("firstName")} ${data.get("lastName")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`
      );
      window.open(`mailto:octagon@scdsstudent.org?subject=${subject}&body=${body}`, "_blank");
      setStatus("success");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const form = e.currentTarget;
      const data = new FormData(form);
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const json = await res.json();
        setErrorMsg(json?.errors?.[0]?.message || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <Layout>
      <div className="flow-container py-12 md:py-16 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Have a question, news tip, correction, or feedback? We&apos;d love to hear from you.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              {status === "success" ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-muted/50 rounded-2xl border border-border">
                  <CheckCircle className="h-14 w-14 text-green-500 mb-4" />
                  <h2 className="font-serif text-2xl font-bold mb-2">Message Sent!</h2>
                  <p className="text-muted-foreground">
                    Thank you for reaching out. We&apos;ll get back to you as soon as possible.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setStatus("idle")}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" required placeholder="Jane" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" required placeholder="Smith" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required placeholder="jane@example.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" required placeholder="News tip, correction, feedback…" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" name="message" rows={6} required placeholder="Tell us what's on your mind…" />
                  </div>

                  {status === "error" && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      {errorMsg}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full font-semibold"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send Message"
                    )}
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
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
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
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
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
                <h2 className="font-serif text-xl font-bold mb-3">News Tips</h2>
                <p className="text-muted-foreground mb-3 leading-relaxed">
                  Have a story we should know about? Our newsroom is always interested in tips from readers.
                </p>
                <a
                  href="mailto:octagon@scdsstudent.org?subject=News Tip"
                  className="text-foreground font-medium hover:opacity-80 transition-opacity underline underline-offset-2"
                >
                  octagon@scdsstudent.org
                </a>
              </div>

              <div className="rule-thin pt-6">
                <h2 className="font-serif text-xl font-bold mb-3">Corrections</h2>
                <p className="text-muted-foreground mb-3 leading-relaxed">
                  We take accuracy seriously. If you&apos;ve found an error in our reporting, please let us know.
                </p>
                <a
                  href="mailto:octagon@scdsstudent.org?subject=Correction Request"
                  className="text-foreground font-medium hover:opacity-80 transition-opacity underline underline-offset-2"
                >
                  octagon@scdsstudent.org
                </a>
              </div>

              <div className="rule-thin pt-6">
                <h2 className="font-serif text-xl font-bold mb-3">Letters to the Editor</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Letters must be signed and may be edited for grammar, punctuation, and length. Send letters to{" "}
                  <a
                    href="mailto:octagon@scdsstudent.org?subject=Letter to the Editor"
                    className="text-foreground font-medium hover:opacity-80 transition-opacity underline underline-offset-2"
                  >
                    octagon@scdsstudent.org
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
