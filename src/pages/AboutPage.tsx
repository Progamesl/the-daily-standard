import { Layout } from "@/components/layout/Layout";
import { useEffect, useRef, useState } from "react";

const policies = [
  {
    id: "mission",
    label: "01",
    title: "Mission Statement",
    body: [
      "The Octagon is the student-run newspaper of Sacramento Country Day high school. The print edition is published eight times a year, and the website is updated daily.",
      "The Octagon is committed to unbiased and comprehensive reporting, serving as a source of reliable information for SCDS students as well as the school and Sacramento community. The Octagon will publish timely and relevant news deemed appropriate by the editors-in-chief and adviser. We seek to highlight school-related events and spotlight the voices of those with a story to share.",
    ],
  },
  {
    id: "editorial",
    label: "02",
    title: "Editorial Policy",
    body: [
      "Editorials shall be approved by and reflect the opinions of the editorial staff, which includes the editors-in-chief, page editors, section editors and copy editors. Columns and commentaries shall be clearly labeled as such and will represent only the opinions of the authors.",
      "In the interest of representing all points of view, letters to the editor will be published, space permitting. The editors-in-chief and adviser may reject letters if the content is deemed inappropriate, offensive or false. All letters must be signed and conform to the above restrictions on published material. The staff retains the right to edit letters for grammar, punctuation and space considerations.",
    ],
  },
  {
    id: "corrections",
    label: "03",
    title: "Corrections Policy",
    body: [
      "The Octagon's policy is to correct factual errors and to clarify potentially confusing statements. Corrections due to significant errors will be noted at the bottom of stories online and will appear on Page 2 of the next print edition.",
      "For minor corrections, such as punctuation, the story will be modified online without the publication of any statement at the bottom of the story.",
    ],
  },
  {
    id: "removal",
    label: "04",
    title: "Story Removal Policy",
    body: [
      "Following well-established journalism ethics and practices, rarely will The Octagon remove published content. Requests to do so will be reviewed by the editors-in-chief and the adviser.",
      "If content information is determined to be inaccurate, in most cases, corrections will be made following the above policy. The editors and the adviser will evaluate requests for any other reasons on a case-by-case basis.",
    ],
  },
  {
    id: "quotes",
    label: "05",
    title: "Quote Check Policy",
    body: [
      "With the exception of quote checking, The Octagon does not share unpublished content outside the newspaper staff. Stories will not be shared in their entirety with sources before publication.",
      "For the sake of accuracy, sources who have been interviewed for a story may ask to have their direct quotations read back to them or the recording of a quotation played back to them. They may not, however, change what they already have said.",
    ],
  },
  {
    id: "comments",
    label: "06",
    title: "Comment Policy",
    body: [
      "Respectful comments on stories online are encouraged. All comments are moderated by the online editors-in-chief and the adviser. Remarks containing ad hominem attacks toward the writer will not be posted.",
      "We reserve the right to remove any comment the editors-in-chief and adviser deem inappropriate. To make a comment, a valid name and email address are required for confirmation, but the email address will not be displayed on the site.",
    ],
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function PolicyCard({ policy, index }: { policy: typeof policies[0]; index: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className="group"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${index * 80}ms, transform 0.6s ease ${index * 80}ms`,
      }}
    >
      <div className="border-t-2 border-foreground pt-6 pb-10 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">
        {/* Number + title column */}
        <div className="md:col-span-4">
          <span className="font-mono text-xs text-muted-foreground tracking-widest block mb-3">
            {policy.label}
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {policy.title}
          </h2>
        </div>
        {/* Body column */}
        <div className="md:col-span-8 space-y-4">
          {policy.body.map((para, i) => (
            <p key={i} className="text-[15px] md:text-base leading-[1.75] text-foreground/75">
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Layout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ background: "hsl(var(--foreground))" }}
      >
        {/* Decorative rule lines */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.04]">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-full bg-white"
              style={{ left: `${(i + 1) * 5.5}%` }}
            />
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          {/* Kicker */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-white/40" />
            <span className="text-white/50 text-xs font-mono tracking-[0.2em] uppercase">
              Sacramento Country Day School
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="font-serif font-black text-white leading-[0.9] tracking-tight mb-10"
            style={{ fontSize: "clamp(3.5rem, 10vw, 8.5rem)" }}
          >
            About<br />
            <em className="italic not-italic" style={{ color: "hsl(var(--accent))" }}>The</em>{" "}
            Octagon
          </h1>

          {/* Mission pull-quote */}
          <div className="max-w-2xl border-l-2 pl-6" style={{ borderColor: "hsl(var(--accent))" }}>
            <p className="text-white/70 text-lg md:text-xl leading-relaxed font-light">
              Student-run. Award-winning. Committed to{" "}
              <span className="text-white font-normal">unbiased and comprehensive</span>{" "}
              reporting for the SCDS community.
            </p>
          </div>

          {/* Stats strip */}
          <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-3 gap-6 max-w-xl">
            {[
              { stat: "8×", label: "Print issues per year" },
              { stat: "Daily", label: "Online updates" },
              { stat: "129+", label: "Archived editions" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <div className="font-serif text-3xl font-bold text-white mb-1">{stat}</div>
                <div className="text-white/40 text-xs uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Policies ─────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-14">
          <span className="text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground">
            Journalism Standards
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-0">
          {policies.map((policy, i) => (
            <PolicyCard key={policy.id} policy={policy} index={i} />
          ))}
        </div>
      </div>

      {/* ── Archives CTA ─────────────────────────────────────────────────── */}
      <div
        className="border-t border-foreground/10"
        style={{ background: "hsl(var(--muted))" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <p className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
              Print Editions
            </p>
            <h3 className="font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight">
              Browse Our Archives
            </h3>
            <p className="mt-3 text-foreground/60 max-w-md leading-relaxed">
              Every print issue going back years — available as interactive flipbooks on Issuu.
            </p>
          </div>
          <div className="flex-shrink-0">
            <a
              href="https://issuu.com/octagon25"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 font-semibold text-sm px-7 py-4 transition-all"
              style={{
                background: "hsl(var(--foreground))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              View All Issues
              <span
                className="inline-block transition-transform group-hover:translate-x-1"
                aria-hidden
              >
                →
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Contact strip ────────────────────────────────────────────────── */}
      <div className="border-t border-foreground/10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            The Octagon — Sacramento Country Day School Newspaper
          </p>
          <a
            href="mailto:octagon@sacds.org"
            className="text-sm font-semibold text-foreground hover:underline underline-offset-4 transition-colors"
          >
            octagon@sacds.org →
          </a>
        </div>
      </div>
    </Layout>
  );
}
