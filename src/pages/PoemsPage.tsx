import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const poems = [
  {
    title: "The Peace of the Wild Things",
    author: "Wendell Berry",
    text: "When despair for the world grows in me\nand I wake in the night at the least sound\nin fear of what my life and my children's lives may be,\nI go and lie down where the wood drake\nrests in his beauty on the water, and the great heron feeds.\nI come into the peace of wild things\nwho do not tax their lives with forethought\nof grief. I come into the presence of still water.\nAnd I feel above me the day-blind stars\nwaiting with their light. For a time\nI rest in the grace of the world, and am free.",
  },
  {
    title: "Those Winter Sundays",
    author: "Robert Hayden",
    text: "Sundays too my father got up early\nand put his clothes on in the blueblack cold,\nthen with cracked hands that ached\nfrom labor in the weekday weather made\nbanked fires blaze. No one ever thanked him.\n\nI'd wake and hear the cold splintering, breaking.\nWhen the rooms were warm, he'd call,\nand slowly I would rise and dress,\nfearing the chronic angers of that house,\n\nSpeaking indifferently to him,\nwho had driven out the cold\nand polished my good shoes as well.\nWhat did I know, what did I know\nof love's austere and lonely offices?",
  },
  {
    title: "Every Day We Are Learning",
    author: "Amanda Gorman",
    text: "Every day we are learning\nHow to live with essence, not ease.\nHow to move with haste, never hate.\nHow to leave this pain that is beyond us\nBehind us.\nJust like a skill or any art,\nWe cannot possess hope without practicing it.\nIt is the most fundamental craft we demand of ourselves.",
  },
  {
    title: "Spring is like a perhaps hand",
    author: "E.E. Cummings",
    text: "Spring is like a perhaps hand\n(which comes carefully\nout of Nowhere)arranging\na window,into which people look(while\npeople stare\narranging and changing placing\ncarefully there a strange\nthing and a known thing here)and\n\nchanging everything carefully\n\nspring is like a perhaps\nHand in a window\n(carefully to\nand fro moving New and\nOld things,while\npeople stare carefully\nmoving a perhaps\nfraction of flower here placing\nan inch of air there)and\n\nwithout breaking anything.",
  },
];

const heroStroke =
  "M70 8 C40 84 92 148 58 222 C32 278 70 334 46 400 C22 462 88 510 60 584";

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

function PoemLines({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="font-serif text-[1.1rem] leading-8 text-[#241d12] sm:text-xl sm:leading-9">
      {lines.map((line, i) =>
        line === "" ? (
          <div key={i} className="h-6" />
        ) : (
          <div key={i} className="overflow-hidden">
            <motion.p
              initial={{ y: 12, opacity: 0.35 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.65, delay: Math.min((i % 8) * 0.06, 0.5), ease: EASE }}
            >
              {line}
            </motion.p>
          </div>
        ),
      )}
    </div>
  );
}

function PoemScene({
  index,
  title,
  author,
  text,
}: {
  index: number;
  title: string;
  author: string;
  text: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const ghostY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [90, -90]);

  return (
    <section ref={ref} className="relative overflow-hidden border-t border-[#1b160f]/20">
      <motion.span
        style={{ y: ghostY }}
        className="pointer-events-none absolute right-[-0.06em] top-10 select-none font-serif text-[clamp(8rem,22vw,15rem)] font-black leading-none text-[#1b160f]/[0.045]"
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, "0")}
      </motion.span>

      <div className="relative mx-auto grid w-full max-w-[1100px] gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-28">
        <div>
          <div className="lg:sticky lg:top-24">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: EASE }}
              className="text-xs font-bold uppercase tracking-[0.35em] text-[#87281a]"
            >
              {String(index + 1).padStart(2, "0")}
            </motion.p>

            <motion.h2
              initial={{ opacity: 0.4, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.75, delay: 0.08, ease: EASE }}
              className="mt-5 font-serif text-[clamp(2.9rem,6.8vw,5.9rem)] font-black leading-[0.92] tracking-[-0.055em] text-[#1b160f]"
            >
              {title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-[#6b5f4c]"
            >
              {author}
            </motion.p>

            <motion.span
              className="mt-8 block h-[3px] w-20 origin-left bg-[#1b160f]"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
            />
          </div>
        </div>

        <PoemLines text={text} />
      </div>
    </section>
  );
}

export default function PoemsPage() {
  const heroRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const heroFade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <main className="min-h-screen bg-[#f1e9d7] text-[#1b160f]">
      <DocumentHead
        title="Poems for the Page"
        description="Four poems chosen by Mr. Wells."
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
        <motion.div style={{ opacity: heroFade }} className="pointer-events-none absolute inset-0" aria-hidden="true">
          <svg
            className="absolute right-[6vw] top-[8vh] h-[80vh] w-32 text-[#1b160f]/[0.14]"
            viewBox="0 0 140 600"
            fill="none"
          >
            <motion.path
              d={heroStroke}
              stroke="currentColor"
              strokeWidth="34"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: EASE }}
            />
            <motion.path
              d={heroStroke}
              stroke="#1b160f"
              strokeWidth="1.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.4, delay: 0.15, ease: EASE }}
            />
          </svg>
        </motion.div>

        <motion.div style={{ y: titleY, opacity: heroFade }} className="relative mx-auto w-full max-w-[1100px]">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xs font-bold uppercase tracking-[0.45em] text-[#87281a]"
          >
            The Octagon · Mr. Wells' selections
          </motion.p>

          <h1 className="mt-6 font-serif text-[clamp(3.6rem,12vw,10.5rem)] font-black leading-[0.87] tracking-[-0.06em]">
            <RevealWords text="Poems for" delay={0.35} className="block" />
            <RevealWords text="the Page" delay={0.55} className="block italic" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease: EASE }}
            className="mt-8 max-w-md font-serif text-xl leading-8 text-[#3d3426]"
          >
            Four poems, worth reading slowly.
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

      {poems.map((p, i) => (
        <PoemScene key={p.title} index={i} title={p.title} author={p.author} text={p.text} />
      ))}

      <footer className="border-t border-[#1b160f]/20 py-16 text-center">
        <p className="font-serif text-lg italic text-[#3d3426]">Selected by Mr. Wells for The Octagon.</p>
      </footer>
    </main>
  );
}
