import { useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Newspaper,
  ArrowUpRight,
  Play,
  Users,
  Shield,
  Code2,
  Zap,
  BarChart2,
  Search,
  ChevronDown,
  Mail,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ease = [0.16, 1, 0.3, 1] as const;

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Barlow:wght@300;400;500;600&display=swap');

:root {
  --font-heading: 'Instrument Serif', Georgia, serif;
  --font-body: 'Barlow', system-ui, sans-serif;
}

.about-page {
  font-family: var(--font-body);
  background: #02040A;
  color: #fff;
}

.about-page ::selection {
  background: rgba(255,255,255,0.3);
  color: #fff;
}

.about-font-heading { font-family: var(--font-heading) !important; }
.about-font-body    { font-family: var(--font-body) !important; }

.liquid-glass {
  background: rgba(255,255,255,0.015);
  background-blend-mode: luminosity;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,0.1),
    0 4px 24px rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
}

.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.3) 0%,
    rgba(255,255,255,0.05) 20%,
    rgba(255,255,255,0) 40%,
    rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.05) 80%,
    rgba(255,255,255,0.2) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box,
                linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.liquid-glass-strong {
  background: rgba(255,255,255,0.02);
  background-blend-mode: luminosity;
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  border: none;
  box-shadow:
    0 8px 32px rgba(0,0,0,0.3),
    inset 0 1px 1px rgba(255,255,255,0.2);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
}
`;

// ─── Data ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Stories", to: "/section/news" },
  { label: "Sections", to: "/section/news" },
  { label: "About", to: "/about" },
  { label: "Join", to: "/contact" },
];

const FEATURE_CARDS = [
  { Icon: Users, title: "Student Reporters", description: "Trained journalists covering every beat from campus news to global affairs." },
  { Icon: Shield, title: "Independent Editorial Board", description: "Zero administrative oversight — our editors make every call." },
  { Icon: Code2, title: "Custom Built Website", description: "No WordPress. Every pixel of this site is hand-coded by students." },
  { Icon: Zap, title: "Real-Time Publishing", description: "Stories go live in minutes, not days. Our CMS was built in-house." },
  { Icon: BarChart2, title: "Interactive Graphics", description: "Data-driven visuals and interactive storytelling for complex topics." },
  { Icon: Search, title: "Investigative Reporting", description: "FOIA requests, source cultivation, and long-form investigations." },
];

const DIFFERENTIATORS = [
  { title: "Fully Custom Coded Newsroom", description: "Built from scratch with React, TypeScript, and Supabase — no off-the-shelf CMS." },
  { title: "No Templates or WordPress", description: "Every component, every layout, every interaction crafted by hand for editorial excellence." },
  { title: "Lightning Fast Performance", description: "Sub-second load times on all devices. Optimized images, code-split bundles." },
  { title: "Data-Driven Storytelling", description: "Charts, interactive timelines, and embedded datasets that bring numbers to life." },
  { title: "Student Investigative Reporting", description: "Accountability journalism at the high school level — because local truth matters." },
  { title: "SEO-Optimized Digital Publishing", description: "Structured data, semantic HTML, and open graph tags built into every article." },
];

const TIMELINE = [
  { year: "1979", title: "The Octagon is Founded", description: "Sacramento Country Day School launches its student newspaper, giving students a permanent voice on campus." },
  { year: "2010s", title: "Digital Transition", description: "Print gives way to pixels. The Octagon moves online, reaching alumni, parents, and students in real time." },
  { year: "2020s", title: "Investigative Expansion", description: "A new generation of reporters takes on school policy, local government, and community accountability stories." },
  { year: "Today", title: "Fully Custom Newsroom Platform", description: "The Octagon launches a bespoke, student-built digital newsroom — one of the most advanced high school news sites in California." },
];

const SECTIONS_BENTO = [
  { label: "News", description: "Campus, local, and national coverage.", img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80", wide: true },
  { label: "Opinion", description: "Student voices on what matters.", img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80", wide: false },
  { label: "Arts & Culture", description: "Film, music, theatre, and more.", img: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&q=80", wide: false },
  { label: "Sports", description: "Game coverage from every season.", img: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80", wide: true },
];

const FAQS = [
  { q: "What is The Octagon?", a: "The Octagon is the independent student newspaper of Sacramento Country Day School. We cover campus life, local news, arts, sports, and opinion — entirely student-run." },
  { q: "Who writes the articles?", a: "All articles are written, edited, and published by students. Our staff ranges from staff writers to senior editors and section leads." },
  { q: "Is the paper independent?", a: "Yes — completely. The Octagon operates independently of school administration. Our editorial decisions are made solely by student editors." },
  { q: "How can students join?", a: "Any Sacramento Country Day School student can apply to join the staff. Reach out via our contact page or talk to the editor-in-chief directly." },
];

// ─── Reusable animated components ─────────────────────────────────────────────
function BlurText({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <motion.span
      className={`inline about-font-heading ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          variants={{
            hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
            visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease } },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AboutPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 600], ["0%", "20%"]);

  return (
    <div className="about-page min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* ── A. NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-6 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="liquid-glass rounded-full w-10 h-10 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <span className="about-font-heading text-white text-lg hidden sm:block">
            The Octagon
          </span>
        </Link>

        {/* Nav links */}
        <div className="liquid-glass rounded-full px-2 py-2 hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="about-font-body px-4 py-1.5 text-sm text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          to="/"
          className="about-font-body flex items-center gap-1.5 bg-white text-[#02040A] px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Read Latest
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* ── B. HERO ───────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video background */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{ y: heroParallax }}
        >
          <video
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            autoPlay
            muted
            loop
            playsInline
          >
            <source
              src="https://videos.pexels.com/video-files/6615954/6615954-hd_1920_1080_25fps.mp4"
              type="video/mp4"
            />
          </video>
        </motion.div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#02040A]/30 via-[#02040A]/50 to-[#02040A]" />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24">
          <FadeUp>
            <div className="liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-white/60 uppercase tracking-[0.2em] mb-8 about-font-body">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 inline-block" />
              Student Journalism Since 1979
            </div>
          </FadeUp>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight text-balance mb-6">
            <BlurText text="The Voice of Sacramento Country Day School" className="italic" />
          </h1>

          <FadeUp delay={0.2}>
            <p className="about-font-body text-white/60 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              The Octagon is the independent student newspaper reporting on the ideas, people, and events shaping our community — written entirely by students, for students.
            </p>
          </FadeUp>

          <FadeUp delay={0.35}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/"
                className="about-font-body liquid-glass-strong rounded-full px-7 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Explore Stories
              </Link>
              <button
                className="about-font-body flex items-center gap-2.5 rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-white/70 hover:text-white hover:border-white/40 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                Watch the Newsroom
              </button>
            </div>
          </FadeUp>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/30" />
        </motion.div>
      </section>

      {/* ── C. MISSION STATEMENT ─────────────────────────────────────────── */}
      <section className="relative py-40 px-6 text-center overflow-hidden">
        {/* Ambient glow orb */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto">
          <FadeUp>
            <p className="about-font-body text-xs uppercase tracking-[0.25em] text-white/40 mb-8">
              Our Mission
            </p>
          </FadeUp>
          <h2 className="text-3xl sm:text-5xl md:text-6xl leading-tight tracking-tight text-balance mb-10">
            <BlurText text="Student voices. Real reporting. A digital newsroom built for the future." className="italic" />
          </h2>
          <FadeUp delay={0.3}>
            <p className="about-font-body text-white/60 text-lg leading-loose max-w-3xl mx-auto">
              The Octagon is a student-run publication at Sacramento Country Day School committed to the principles of responsible journalism, ethical storytelling, and radical transparency. We believe high school is the right time to start doing real journalism — and we've built the infrastructure to do it at the highest level.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── D. THE NEWSROOM ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
          {/* Left: Image card */}
          <FadeUp>
            <div className="liquid-glass rounded-2xl overflow-hidden h-[500px] lg:h-[650px] relative group cursor-default">
              <img
                src="https://images.unsplash.com/photo-1585241645927-c7a8e5840c42?w=1200&q=80"
                alt="Students working in a newsroom"
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-8 left-8">
                <p className="about-font-body text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Est. 1979</p>
                <h3 className="about-font-heading italic text-3xl text-white">The Octagon Newsroom</h3>
                <p className="about-font-body text-white/60 text-sm mt-1">Student-run since 1979</p>
              </div>
            </div>
          </FadeUp>

          {/* Right: Feature grid */}
          <div>
            <FadeUp>
              <p className="about-font-body text-xs uppercase tracking-[0.2em] text-white/40 mb-4">The Infrastructure</p>
              <h2 className="about-font-heading italic text-4xl sm:text-5xl text-white mb-8 leading-tight tracking-tight">
                Built for Modern Journalism
              </h2>
            </FadeUp>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURE_CARDS.map(({ Icon, title, description }, i) => (
                <FadeUp key={title} delay={i * 0.07}>
                  <div className="liquid-glass rounded-xl p-5 h-full">
                    <Icon className="w-5 h-5 text-white/50 mb-3" />
                    <h4 className="about-font-body text-white font-medium text-sm mb-1.5">{title}</h4>
                    <p className="about-font-body text-white/50 text-xs leading-relaxed">{description}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── E. WHAT MAKES US DIFFERENT ───────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <FadeUp>
            <p className="about-font-body text-xs uppercase tracking-[0.25em] text-white/40 text-center mb-4">Why We're Different</p>
            <h2 className="about-font-heading italic text-4xl sm:text-5xl md:text-6xl text-white text-center mb-16 tracking-tight text-balance">
              Engineering the Future of Student Journalism
            </h2>
          </FadeUp>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DIFFERENTIATORS.map(({ title, description }, i) => (
              <motion.div
                key={title}
                className="liquid-glass rounded-2xl p-7 cursor-default"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, ease, delay: i * 0.06 }}
                whileHover={{ y: -6, transition: { duration: 0.3, ease } }}
              >
                <div className="w-8 h-px bg-white/30 mb-5" />
                <h3 className="about-font-body text-white font-medium text-base mb-2 leading-snug">{title}</h3>
                <p className="about-font-body text-white/50 text-sm leading-relaxed">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── F. HISTORY TIMELINE ──────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <p className="about-font-body text-xs uppercase tracking-[0.25em] text-white/40 text-center mb-4">Our History</p>
            <h2 className="about-font-heading italic text-4xl sm:text-5xl text-white text-center mb-20 tracking-tight">
              Decades of Student Journalism
            </h2>
          </FadeUp>

          <div className="relative">
            {/* Center gradient line */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden lg:block"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.2) 15%, rgba(255,255,255,0.2) 85%, transparent)" }}
            />

            <div className="flex flex-col gap-16">
              {TIMELINE.map(({ year, title, description }, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <FadeUp key={year} delay={i * 0.1}>
                    <div className={`relative flex items-center gap-8 lg:gap-0 ${isLeft ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
                      {/* Card */}
                      <div className={`w-full lg:w-[calc(50%-2rem)] ${isLeft ? "lg:pr-8 lg:text-right" : "lg:pl-8"}`}>
                        <div className="liquid-glass rounded-2xl p-7">
                          <p className="about-font-body text-xs uppercase tracking-[0.2em] text-white/40 mb-2">{year}</p>
                          <h3 className="about-font-heading italic text-2xl text-white mb-2">{title}</h3>
                          <p className="about-font-body text-white/50 text-sm leading-relaxed">{description}</p>
                        </div>
                      </div>

                      {/* Glowing node */}
                      <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 z-10 items-center justify-center">
                        <span
                          className="absolute inset-0 rounded-full bg-white/80"
                          style={{ boxShadow: "0 0 0 4px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.3)" }}
                        />
                      </div>

                      {/* Spacer */}
                      <div className="hidden lg:block w-[calc(50%-2rem)]" />
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── G. SECTIONS BENTO ────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <FadeUp>
            <p className="about-font-body text-xs uppercase tracking-[0.25em] text-white/40 text-center mb-4">Coverage Areas</p>
            <h2 className="about-font-heading italic text-4xl sm:text-5xl text-white text-center mb-12 tracking-tight">
              What We Cover
            </h2>
          </FadeUp>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ gridAutoRows: "260px" }}>
            {SECTIONS_BENTO.map(({ label, description, img, wide }, i) => (
              <FadeUp key={label} delay={i * 0.08} className={wide ? "md:col-span-2" : ""}>
                <div className="group relative h-full rounded-2xl overflow-hidden cursor-pointer">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url(${img})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <h3 className="about-font-heading italic text-2xl sm:text-3xl text-white">{label}</h3>
                    <p className="about-font-body text-white/60 text-sm mt-1">{description}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── H. FAQ ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <FadeUp>
            <p className="about-font-body text-xs uppercase tracking-[0.25em] text-white/40 text-center mb-4">FAQ</p>
            <h2 className="about-font-heading italic text-4xl sm:text-5xl text-white text-center mb-14 tracking-tight">
              Common Questions
            </h2>
          </FadeUp>

          <div className="flex flex-col divide-y divide-white/10">
            {FAQS.map(({ q, a }, i) => (
              <FadeUp key={q} delay={i * 0.06}>
                <div>
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full flex items-center justify-between py-6 text-left group"
                  >
                    <span className="about-font-body text-white font-medium text-base pr-8 leading-snug">{q}</span>
                    <motion.div animate={{ rotate: faqOpen === i ? 180 : 0 }} transition={{ duration: 0.3, ease }}>
                      <ChevronDown className="w-5 h-5 text-white/40 flex-shrink-0 group-hover:text-white/70 transition-colors" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {faqOpen === i && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease }}
                        style={{ overflow: "hidden" }}
                      >
                        <p className="about-font-body text-white/60 text-sm leading-loose pb-6">{a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── I. FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 pt-20 pb-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            {/* Left */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="liquid-glass rounded-full w-9 h-9 flex items-center justify-center">
                  <Newspaper className="w-4 h-4 text-white" />
                </div>
                <span className="about-font-heading text-white">The Octagon</span>
              </div>
              <h3 className="about-font-heading italic text-2xl sm:text-3xl text-white mb-6 leading-snug">
                The next generation of journalism starts here.
              </h3>
              <div className="flex gap-2">
                <div className="flex-1 liquid-glass rounded-xl px-4 py-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="about-font-body bg-transparent text-sm text-white placeholder-white/30 outline-none w-full"
                  />
                </div>
                <button className="about-font-body bg-white text-[#02040A] px-4 py-3 rounded-xl text-sm font-medium hover:bg-white/90 transition-colors whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Middle */}
            <div>
              <p className="about-font-body text-xs uppercase tracking-[0.2em] text-white/40 mb-5">Sections</p>
              <ul className="flex flex-col gap-3">
                {[
                  { name: "News", slug: "us" },
                  { name: "Opinion", slug: "opinion" },
                  { name: "Arts & Entertainment", slug: "arts" },
                  { name: "Sports", slug: "sports" },
                ].map(({ name, slug }) => (
                  <li key={slug}>
                    <Link to={`/section/${slug}`} className="about-font-body text-white/60 hover:text-white text-sm transition-colors">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right */}
            <div>
              <p className="about-font-body text-xs uppercase tracking-[0.2em] text-white/40 mb-5">Publication</p>
              <ul className="flex flex-col gap-3">
                {[
                  { label: "About", to: "/about" },
                  { label: "Join the Staff", to: "/contact" },
                  { label: "Contact", to: "/contact" },
                  { label: "Archive", to: "/" },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="about-font-body text-white/60 hover:text-white text-sm transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom row */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="about-font-body text-white/30 text-xs">
              © {new Date().getFullYear()} The Octagon — Sacramento Country Day School
            </p>
            <p className="about-font-heading italic text-white/20 text-sm">
              Sacramento Country Day School · Est. 1979
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
