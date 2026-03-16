import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DocumentHead } from "@/components/seo/DocumentHead";
import { Mail, Award, TrendingUp, Users, Monitor, Newspaper, CheckCircle, ChevronRight } from "lucide-react";

// Brand crimson pulled from the Octagon logo/brochure
const CRIMSON = "#8B1A1A";

const STATS = [
  { value: "5,000", label: "Online Views", sub: "per month" },
  { value: "1,000", label: "Print Readers", sub: "per issue" },
  { value: "8×", label: "Print Issues", sub: "per school year" },
  { value: "K–12", label: "Audience", sub: "students, parents, faculty & alumni" },
];

const AWARDS = [
  { icon: Award, text: "1st in California — Online General Excellence" },
  { icon: Award, text: "3rd in California — Print General Excellence" },
  { icon: Award, text: "CNPA Silver Crown — Hybrid News" },
];

const PRINT_SIZES = [
  {
    name: "2×6",
    dims: "2 col × 6 in",
    price: 120,
    description: "Great for small businesses and single-event promotions.",
    highlight: false,
  },
  {
    name: "3×4",
    dims: "3 col × 4 in",
    price: 180,
    description: "Ideal for recurring advertisers with a consistent brand presence.",
    highlight: false,
  },
  {
    name: "6×4",
    dims: "6 col × 4 in",
    price: 260,
    description: "A bold horizontal banner — impossible to miss.",
    highlight: false,
  },
  {
    name: "Half Page",
    dims: "10 col × 8 in",
    price: 800,
    description: "Premium placement for maximum visual impact.",
    highlight: true,
  },
  {
    name: "Full Page",
    dims: "11 col × 17 in",
    price: 1400,
    description: "Dominate the page. Your ad, front and center.",
    highlight: false,
  },
];

const REASONS = [
  {
    icon: Users,
    title: "Highly Engaged Audience",
    body: "Reach Sacramento Country Day students, parents, faculty, and alumni — an educated, community-oriented demographic with real purchasing power.",
  },
  {
    icon: TrendingUp,
    title: "Award-Winning Platform",
    body: "Advertise alongside journalism recognized as #1 in California for Online Excellence. Your brand benefits from our credibility.",
  },
  {
    icon: Monitor,
    title: "Multi-Platform Reach",
    body: "Print and digital placements ensure your message reaches readers wherever they are — in hand or on screen.",
  },
  {
    icon: Newspaper,
    title: "Community Trust",
    body: "The Octagon has served the SCDS community for decades. Readers trust our content — and the brands that support it.",
  },
];

export default function AdvertisePage() {
  const [form, setForm] = useState({ name: "", org: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Open mail client with prefilled content
    const subject = encodeURIComponent(`Advertising Inquiry — ${form.org || form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nOrganization: ${form.org}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:scdsoctagon1@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <Layout>
      <DocumentHead
        title="Advertise — The Octagon"
        description="Reach 5,000+ monthly readers and 1,000 print readers per issue. Advertise with The Octagon, Sacramento's award-winning high school newspaper."
      />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${CRIMSON} 0%, #5a0f0f 100%)` }}
      >
        {/* Decorative octagon watermark */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none flex items-center justify-center"
          aria-hidden
        >
          <svg viewBox="0 0 100 100" className="w-[600px] h-[600px]">
            <polygon
              points="29,7 71,7 93,29 93,71 71,93 29,93 7,71 7,29"
              fill="none"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="flow-container relative py-20 md:py-28 text-white">
          <div className="max-w-3xl">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
              Advertising Opportunities
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight mb-6">
              Put Your Brand in Front of{" "}
              <span style={{ color: "#f9c6c6" }}>Sacramento's</span>{" "}
              Most Engaged Readers
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 max-w-2xl">
              The Octagon is Sacramento Country Day's award-winning newspaper — 1st in California for Online
              Excellence. With 5,000 monthly online views and 1,000 print readers per issue, your ad reaches
              students, parents, faculty, and alumni who are active in the community.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
                style={{ background: "white", color: CRIMSON }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f0f0f0"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "white"; }}
              >
                Get Started
                <ChevronRight className="h-4 w-4" />
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm border border-white/40 text-white hover:bg-white/10 transition-all"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="flow-container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-slate-200">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center px-4">
                <span
                  className="font-serif text-4xl md:text-5xl font-bold leading-none mb-1"
                  style={{ color: CRIMSON }}
                >
                  {stat.value}
                </span>
                <span className="font-semibold text-slate-900 text-sm mt-1">{stat.label}</span>
                <span className="text-xs text-slate-500 mt-0.5">{stat.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Awards ───────────────────────────────────────────────────────────── */}
      <section className="flow-container py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 text-center">
            Award-Winning Journalism
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {AWARDS.map((award) => (
              <div
                key={award.text}
                className="flex items-center gap-3 px-5 py-4 rounded-xl border border-slate-200 bg-white shadow-sm flex-1"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${CRIMSON}15` }}
                >
                  <award.icon className="h-4 w-4" style={{ color: CRIMSON }} />
                </div>
                <span className="text-sm font-medium text-slate-800 leading-snug">{award.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why advertise ────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="flow-container py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-3">
              Why Advertise With Us?
            </h2>
            <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto">
              A captive, local audience. A trusted brand. An award-winning platform.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {REASONS.map((r) => (
                <div
                  key={r.title}
                  className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${CRIMSON}12` }}
                  >
                    <r.icon className="h-5 w-5" style={{ color: CRIMSON }} />
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-2 text-slate-900">{r.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="flow-container py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-3">
            Advertising Rates
          </h2>
          <p className="text-slate-500 text-center mb-14 max-w-xl mx-auto">
            Transparent pricing with no hidden fees. All print ads run in our high-quality tabloid — distributed to every student, parent, and faculty member.
          </p>

          {/* Print */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Newspaper className="h-5 w-5" style={{ color: CRIMSON }} />
              <h3 className="font-serif text-2xl font-bold">Print Advertising</h3>
              <span
                className="ml-auto text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: `${CRIMSON}15`, color: CRIMSON }}
              >
                10% off — 4 issues or more
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRINT_SIZES.map((size) => (
                <div
                  key={size.name}
                  className={`relative rounded-2xl border p-6 transition-all ${
                    size.highlight
                      ? "shadow-lg ring-2"
                      : "border-slate-200 bg-white hover:shadow-md"
                  }`}
                  style={
                    size.highlight
                      ? { borderColor: CRIMSON, ringColor: CRIMSON, background: "white" }
                      : {}
                  }
                >
                  {size.highlight && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: CRIMSON }}
                    >
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-bold text-slate-900 text-lg">{size.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{size.dims}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-2xl font-bold" style={{ color: CRIMSON }}>
                        ${size.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-400">per issue</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{size.description}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-5 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm"
              style={{ background: `${CRIMSON}0e`, color: CRIMSON }}
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                Book 4 or more consecutive issues and receive <strong>10% off</strong> your total. Contact us for a custom multi-issue package.
              </span>
            </div>
          </div>

          {/* Online */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Monitor className="h-5 w-5" style={{ color: CRIMSON }} />
              <h3 className="font-serif text-2xl font-bold">Online Advertising</h3>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div
                className="px-8 py-6 text-white"
                style={{ background: `linear-gradient(135deg, ${CRIMSON} 0%, #5a0f0f 100%)` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-serif text-3xl font-bold">$50</p>
                    <p className="text-white/70 text-sm">per month</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-bold text-lg">Digital Banner Ad</p>
                    <p className="text-white/70 text-sm">Displayed on scdsoctagon.net</p>
                  </div>
                </div>
              </div>
              <div className="px-8 py-6 grid sm:grid-cols-2 gap-3">
                {[
                  "Adblock-proof placement",
                  "5,000+ monthly page views",
                  "Seen by students, parents & faculty",
                  "Desktop & mobile optimized",
                  "Cancel any time",
                  "Linked directly to your website",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="h-4 w-4 shrink-0" style={{ color: CRIMSON }} />
                    {feat}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial / quote strip ─────────────────────────────────────────── */}
      <section
        className="py-16"
        style={{ background: `linear-gradient(135deg, ${CRIMSON} 0%, #5a0f0f 100%)` }}
      >
        <div className="flow-container text-center text-white">
          <p className="font-serif text-2xl md:text-3xl font-bold max-w-3xl mx-auto leading-relaxed mb-6">
            "The Octagon reaches every family at Sacramento Country Day — the most engaged community in Sacramento."
          </p>
          <p className="text-white/60 text-sm uppercase tracking-widest font-semibold">
            The Octagon Advertising Team
          </p>
        </div>
      </section>

      {/* ── Contact form ─────────────────────────────────────────────────────── */}
      <section id="contact" className="flow-container py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-3">
            Ready to Advertise?
          </h2>
          <p className="text-slate-500 text-center mb-10">
            Fill out the form below and our advertising team will get back to you within 1–2 business days. Or email us directly at{" "}
            <a
              href="mailto:scdsoctagon1@gmail.com"
              className="font-semibold underline underline-offset-2"
              style={{ color: CRIMSON }}
            >
              scdsoctagon1@gmail.com
            </a>.
          </p>

          {sent ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-serif text-xl font-bold text-slate-900 mb-2">Message sent!</h3>
              <p className="text-slate-600 text-sm">
                Your email client should have opened with your inquiry. If it didn't,{" "}
                <a
                  href="mailto:scdsoctagon1@gmail.com"
                  className="underline font-semibold"
                  style={{ color: CRIMSON }}
                >
                  email us directly
                </a>.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Your Name <span style={{ color: CRIMSON }}>*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                    style={{ "--tw-ring-color": CRIMSON } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Organization / Business
                  </label>
                  <input
                    type="text"
                    value={form.org}
                    onChange={e => setForm(f => ({ ...f, org: e.target.value }))}
                    placeholder="Acme Co."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email <span style={{ color: CRIMSON }}>*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(916) 555-0100"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  What are you interested in? <span style={{ color: CRIMSON }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="e.g. Half-page print ad for 4 issues, plus online banner for the spring semester…"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition resize-y"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-lg font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${CRIMSON} 0%, #5a0f0f 100%)` }}
              >
                <Mail className="h-4 w-4" />
                Send Inquiry
              </button>

              <p className="text-xs text-slate-400 text-center">
                By submitting, your email client will open with a pre-filled message to our team.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── Bottom CTA strip ─────────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="flow-container py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-serif text-xl font-bold text-slate-900">Have questions first?</p>
              <p className="text-slate-500 text-sm mt-1">
                Read about our publication or reach our general newsroom.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/about"
                className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-white transition-all"
              >
                About Us
              </Link>
              <Link
                to="/contact"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: CRIMSON }}
              >
                Contact Newsroom
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
