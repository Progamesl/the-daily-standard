import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const awards = [
  { title: "Most likely to cure cancer", winner: "Rebecca" },
  { title: "Most likely to be a millionaire", winner: "Ashly" },
  { title: "Most likely to go viral", winner: "Riley" },
  { title: "Best dressed", winner: "Ella H" },
  { title: "Best humor", winner: "Jake" },
  { title: "Most likely to not study and get an A", winner: "Andrew" },
  { title: "Most likely to be late for graduation", winner: "Itzel" },
  { title: "Worst sleep schedule", winner: "Liam" },
  { title: "Worst case of senioritis", winner: "Rehan" },
];

const heroStroke =
  "M8 96 C120 30 260 18 380 52 C470 78 540 132 640 116 C720 103 760 60 830 64";

const motes = [
  { left: "16%", top: "28%", size: 5, duration: 9, delay: 0 },
  { left: "27%", top: "62%", size: 3, duration: 11, delay: 1.4 },
  { left: "58%", top: "22%", size: 4, duration: 10, delay: 0.6 },
  { left: "72%", top: "52%", size: 6, duration: 12, delay: 2.1 },
  { left: "46%", top: "70%", size: 3, duration: 8, delay: 3 },
  { left: "86%", top: "34%", size: 4, duration: 13, delay: 1 },
];

function RevealWords({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "112%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.09, ease: EASE }}
          >
            {word}
            {"\u00A0"}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function AwardScene({ index, title, winner }: { index: number; title: string; winner: string }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [70, -70]);
  const ruleX = useTransform(scrollYProgress, [0.15, 0.45], [0.25, 1]);
  const right = index % 2 === 1;

  return (
    <li ref={ref} className="relative isolate min-h-[72svh] overflow-hidden border-t border-[#1b160f]/20">
      <motion.span
        style={{ y: ghostY }}
        className={`pointer-events-none absolute top-1/2 -z-10 -translate-y-1/2 select-none font-serif text-[clamp(16rem,42vw,34rem)] font-black leading-none text-[#1b160f]/[0.055] ${
          right ? "left-[-0.08em]" : "right-[-0.08em]"
        }`}
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, "0")}
      </motion.span>

      <div
        className={`relative mx-auto grid min-h-[72svh] w-full max-w-[1180px] items-center gap-8 px-6 py-20 sm:px-10 lg:grid-cols-[0.42fr_1fr] ${
          right ? "lg:grid-cols-[1fr_0.42fr]" : ""
        }`}
      >
        <div className={`space-y-5 ${right ? "lg:col-start-2 lg:text-right" : ""}`}>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.42em] text-[#87281a] sm:text-xs">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="max-w-[18rem] text-sm font-bold uppercase leading-7 tracking-[0.28em] text-[#87281a] sm:text-base">
            {title}
          </p>
          <motion.span
            style={{ scaleX: ruleX }}
            className={`block h-[3px] w-24 bg-[#1b160f] ${right ? "ml-auto origin-right" : "origin-left"}`}
            aria-hidden="true"
          />
        </div>

        <div className={right ? "lg:col-start-1 lg:row-start-1 lg:text-left" : ""}>
          <motion.h3
            initial={{ opacity: 0.25, y: 18, letterSpacing: "-0.08em" }}
            whileInView={{ opacity: 1, y: 0, letterSpacing: "-0.055em" }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.75, ease: EASE }}
            className="max-w-full break-words font-serif text-[clamp(4.6rem,14vw,13rem)] font-black leading-[0.82] text-[#1b160f]"
          >
            {winner}
          </motion.h3>
        </div>
      </div>
    </li>
  );
}

export default function SeniorSuperlativesPage() {
  const heroRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 150]);
  const inkY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90]);
  const heroFade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <main className="min-h-screen bg-[#f1e9d7] text-[#1b160f]">
      <DocumentHead
        title="Senior Superlatives"
        description="Senior superlatives, voted by the Class of 2026."
        type="article"
      />

      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(90deg,rgba(27,22,15,.07)_1px,transparent_1px),linear-gradient(rgba(27,22,15,.05)_1px,transparent_1px)] [background-size:88px_88px]" />
      </div>

      <header className="absolute left-0 top-0 z-20 w-full px-6 py-6 sm:px-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 border border-[#1b160f] bg-[#f7f0e0] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#1b160f] transition-colors duration-200 hover:bg-[#1b160f] hover:text-[#f7f0e0]"
        >
          <ArrowLeft className="h-4 w-4" />
          The Octagon
        </Link>
      </header>

      {/* Title sequence */}
      <section
        ref={heroRef}
        className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-6 sm:px-10"
      >
        <motion.div style={{ y: inkY, opacity: heroFade }} className="pointer-events-none absolute inset-0" aria-hidden="true">
          <svg
            className="absolute left-1/2 top-[26%] w-[130vw] max-w-none -translate-x-1/2 text-[#1b160f]/[0.14] sm:w-[95vw]"
            viewBox="0 0 840 160"
            fill="none"
          >
            <motion.path
              d={heroStroke}
              stroke="currentColor"
              strokeWidth="34"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.9, ease: EASE }}
            />
            <motion.path
              d={heroStroke}
              stroke="#1b160f"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.3, delay: 0.15, ease: EASE }}
            />
          </svg>

          {!reduce &&
            motes.map((m, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-[#1b160f]/25"
                style={{ left: m.left, top: m.top, width: m.size, height: m.size }}
                animate={{ y: [0, -46, 0], opacity: [0, 0.7, 0] }}
                transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
        </motion.div>

        <motion.div style={{ y: titleY, opacity: heroFade }} className="relative mx-auto w-full max-w-[1100px]">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xs font-bold uppercase tracking-[0.45em] text-[#87281a]"
          >
            The Octagon · Class of 2026
          </motion.p>

          <h1 className="mt-6 font-serif text-[clamp(3.8rem,13vw,11.5rem)] font-black leading-[0.85] tracking-[-0.06em]">
            <RevealWords text="Senior" delay={0.35} className="block" />
            <RevealWords text="Superlatives" delay={0.55} className="block italic" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.15, ease: EASE }}
            className="mt-8 max-w-md font-serif text-xl leading-8 text-[#3d3426]"
          >
            The senior class voted. The results are final.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          style={{ opacity: heroFade }}
          className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
          aria-hidden="true"
        >
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.4em] text-[#1b160f]/50">Scroll</span>
          <motion.span
            className="block h-10 w-px bg-[#1b160f]/50"
            animate={reduce ? undefined : { scaleY: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </section>

      {/* Award scenes */}
      <ol className="relative">
        {awards.map((a, i) => (
          <AwardScene key={a.title} index={i} title={a.title} winner={a.winner} />
        ))}
      </ol>

      {/* Finale */}
      <section className="relative overflow-hidden border-t border-[#1b160f]/20">
        <div className="relative mx-auto flex min-h-[90vh] w-full max-w-[1100px] flex-col items-center justify-center px-6 py-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="text-xs font-bold uppercase tracking-[0.35em] text-[#87281a]"
          >
            Best bromance
          </motion.p>

          <motion.h2
            initial={{ opacity: 0.3, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="mt-6 font-serif text-[clamp(4rem,13vw,11rem)] font-black leading-[0.85] tracking-[-0.055em]"
          >
            Dylan + Kamron
          </motion.h2>

          <motion.div
            initial={{ scale: 1.7, opacity: 0, rotate: -10 }}
            whileInView={{ scale: 1, opacity: 1, rotate: -5 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 border-[3px] border-[#87281a] px-6 py-3 font-serif text-lg font-black uppercase tracking-[0.14em] text-[#87281a]"
          >
            Class of '26
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 1.1 }}
            className="mt-16 font-serif text-lg italic text-[#3d3426]"
          >
            Congratulations, seniors.
          </motion.p>
        </div>
      </section>
    </main>
  );
}
