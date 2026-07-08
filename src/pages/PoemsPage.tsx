import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";

const poems = [
  {
    eyebrow: "Plate 01",
    title: "The Peace of the Wild Things",
    author: "Wendell Berry",
    seal: "wild",
    text: "When despair for the world grows in me\nand I wake in the night at the least sound\nin fear of what my life and my children's lives may be,\nI go and lie down where the wood drake\nrests in his beauty on the water, and the great heron feeds.\nI come into the peace of wild things\nwho do not tax their lives with forethought\nof grief. I come into the presence of still water.\nAnd I feel above me the day-blind stars\nwaiting with their light. For a time\nI rest in the grace of the world, and am free.",
  },
  {
    eyebrow: "Plate 02",
    title: "Those Winter Sundays",
    author: "Robert Hayden",
    seal: "cold",
    text: "Sundays too my father got up early\nand put his clothes on in the blueblack cold,\nthen with cracked hands that ached\nfrom labor in the weekday weather made\nbanked fires blaze. No one ever thanked him.\n\nI'd wake and hear the cold splintering, breaking.\nWhen the rooms were warm, he'd call,\nand slowly I would rise and dress,\nfearing the chronic angers of that house,\n\nSpeaking indifferently to him,\nwho had driven out the cold\nand polished my good shoes as well.\nWhat did I know, what did I know\nof love's austere and lonely offices?",
  },
  {
    eyebrow: "Plate 03",
    title: "Every Day We Are Learning",
    author: "Amanda Gorman",
    seal: "hope",
    text: "Every day we are learning\nHow to live with essence, not ease.\nHow to move with haste, never hate.\nHow to leave this pain that is beyond us\nBehind us.\nJust like a skill or any art,\nWe cannot possess hope without practicing it.\nIt is the most fundamental craft we demand of ourselves.",
  },
  {
    eyebrow: "Plate 04",
    title: "Spring is like a perhaps hand",
    author: "E.E. Cummings",
    seal: "hand",
    text: "Spring is like a perhaps hand\n(which comes carefully\nout of Nowhere)arranging\na window,into which people look(while\npeople stare\narranging and changing placing\ncarefully there a strange\nthing and a known thing here)and\n\nchanging everything carefully\n\nspring is like a perhaps\nHand in a window\n(carefully to\nand fro moving New and\nOld things,while\npeople stare carefully\nmoving a perhaps\nfraction of flower here placing\nan inch of air there)and\n\nwithout breaking anything.",
  },
];

const verticalStroke =
  "M75 10 C44 88 93 151 58 225 C31 282 69 338 44 404 C20 466 88 513 62 586";

export default function PoemsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#efe6d3] text-[#17130d]">
      <DocumentHead
        title="Poems for the Page"
        description="An ink-wash poetry gallery from The Octagon."
        type="article"
      />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#efe6d3]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(90deg,rgba(23,19,13,.08)_1px,transparent_1px),linear-gradient(rgba(23,19,13,.055)_1px,transparent_1px)] [background-size:83px_83px]" />
        <svg className="absolute left-[-13rem] top-[-9rem] h-[36rem] w-[36rem] text-[#17130d]/[0.045]" viewBox="0 0 500 500" aria-hidden="true">
          <path
            fill="currentColor"
            d="M80 211C97 112 169 48 262 63c91 15 168 80 170 177 2 105-93 180-191 178C143 416 62 318 80 211Z"
          />
        </svg>
        <svg className="absolute bottom-[-13rem] right-[-8rem] h-[33rem] w-[33rem] text-[#7d1d14]/[0.07]" viewBox="0 0 500 500" aria-hidden="true">
          <path
            fill="currentColor"
            d="M65 263C55 164 147 85 239 73c101-14 188 55 204 149 17 100-65 188-169 210C168 455 76 367 65 263Z"
          />
        </svg>
        <motion.svg
          className="absolute left-[3vw] top-[12vh] hidden h-[36rem] w-36 text-[#17130d]/18 lg:block"
          viewBox="0 0 140 610"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9 }}
          aria-hidden="true"
        >
          <motion.path
            d={verticalStroke}
            stroke="currentColor"
            strokeWidth="34"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.1, ease: [0.65, 0, 0.35, 1] }}
          />
          <motion.path
            d={verticalStroke}
            stroke="#17130d"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.35, delay: 0.12, ease: [0.65, 0, 0.35, 1] }}
          />
        </motion.svg>
      </div>

      <div className="relative mx-auto max-w-[1180px] px-[22px] py-7 sm:px-8 lg:px-[54px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 border border-[#17130d] bg-[#f8f1e3] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#17130d] shadow-[5px_5px_0_rgba(23,19,13,0.16)] transition-colors duration-200 hover:bg-[#17130d] hover:text-[#f8f1e3]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to The Octagon
        </Link>

        <section className="grid gap-12 py-[73px] lg:grid-cols-[0.64fr_1.36fr] lg:items-end">
          <aside className="hidden border-l border-[#17130d] pl-6 lg:block">
            <p className="[writing-mode:vertical-rl] font-sans text-xs font-black uppercase tracking-[0.38em] text-[#7d1d14]">
              Octagon literary plates
            </p>
          </aside>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[780px]"
          >
            <div className="mb-8 flex items-center gap-4">
              <span className="h-px w-16 bg-[#17130d]" />
              <span className="font-sans text-xs font-bold uppercase tracking-[0.42em] text-[#7d1d14]">
                Mr. Wells' selections
              </span>
            </div>
            <h1 className="font-serif text-[clamp(4.1rem,11vw,10.25rem)] font-black leading-[0.82] tracking-[-0.075em]">
              Poems
              <span className="block pl-[0.25em] italic">for the Page</span>
            </h1>
            <p className="mt-8 max-w-[590px] border-l-[6px] border-[#17130d] pl-6 font-serif text-xl leading-8 text-[#332b20] sm:text-2xl">
              Four poems set like hanging scrolls: quiet, deliberate, and animated with ink instead of spectacle.
            </p>
          </motion.div>
        </section>

        <section className="grid gap-[41px] pb-24">
          {poems.map((poem, index) => (
            <motion.article
              key={poem.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.65, delay: index * 0.045, ease: [0.22, 1, 0.36, 1] }}
              className="relative border-2 border-[#17130d] bg-[#f8f1e3] shadow-[12px_12px_0_rgba(23,19,13,0.13)]"
            >
              <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
                <div className="relative border-b border-[#17130d] p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  <div className="absolute right-6 top-6 grid h-[4.7rem] w-[4.7rem] place-items-center border-2 border-[#7d1d14] bg-[#7d1d14] text-center font-serif text-sm font-black uppercase leading-none tracking-[-0.02em] text-[#f8f1e3]">
                    {poem.seal}
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.36em] text-[#7d1d14]">{poem.eyebrow}</p>
                  <h2 className="mt-6 max-w-[24rem] font-serif text-[clamp(2.5rem,5vw,5.25rem)] font-black leading-[0.9] tracking-[-0.06em]">
                    {poem.title}
                  </h2>
                  <p className="mt-7 text-xs font-black uppercase tracking-[0.27em] text-[#6d6254]">By {poem.author}</p>
                  <motion.div
                    className="mt-9 h-[3px] w-24 origin-left bg-[#17130d]"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.72, delay: 0.12 }}
                  />
                </div>

                <div className="relative p-6 sm:p-9 lg:p-11">
                  <div className="absolute left-0 top-0 hidden h-full w-px bg-[#17130d]/20 lg:block" />
                  <pre className="whitespace-pre-wrap font-serif text-[1.08rem] leading-8 text-[#211b14] sm:text-xl sm:leading-10">
                    {poem.text}
                  </pre>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      </div>
    </main>
  );
}
