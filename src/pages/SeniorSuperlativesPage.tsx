import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { DocumentHead } from "@/components/seo/DocumentHead";

const superlatives = [
  { title: "Most likely to cure cancer", winner: "Rebecca", mark: "01" },
  { title: "Most likely to be a millionaire", winner: "Ashly", mark: "02" },
  { title: "Most likely to go viral", winner: "Riley", mark: "03" },
  { title: "Best dressed", winner: "Ella H", mark: "04" },
  { title: "Best humor", winner: "Jake", mark: "05" },
  { title: "Most likely to not study and get an A", winner: "Andrew", mark: "06" },
  { title: "Most likely to be late for graduation", winner: "Itzel", mark: "07" },
  { title: "Worst sleep schedule", winner: "Liam", mark: "08" },
  { title: "Worst case of senioritis", winner: "Rehan", mark: "09" },
  { title: "Best bromance", winner: "Dylan + Kamron", mark: "10" },
];

const inkPath =
  "M12 94 C86 36 161 21 236 48 C298 70 356 133 421 112 C472 96 503 43 557 51 C612 59 641 109 706 94";

export default function SeniorSuperlativesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#eee5d2] text-[#17130d]">
      <DocumentHead
        title="Senior Superlatives"
        description="An ink-wash senior superlatives feature from The Octagon."
        type="article"
      />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#eee5d2]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(90deg,rgba(23,19,13,.08)_1px,transparent_1px),linear-gradient(rgba(23,19,13,.06)_1px,transparent_1px)] [background-size:79px_79px]" />
        <svg className="absolute -left-32 top-10 h-[35rem] w-[35rem] text-[#17130d]/[0.045]" viewBox="0 0 500 500" aria-hidden="true">
          <path
            fill="currentColor"
            d="M72 238C42 142 123 58 232 52c94-5 197 47 211 140 16 103-84 203-197 210C146 409 97 320 72 238Z"
          />
        </svg>
        <svg className="absolute bottom-[-6rem] right-[-12rem] h-[31rem] w-[31rem] text-[#7d1d14]/[0.08]" viewBox="0 0 500 500" aria-hidden="true">
          <path
            fill="currentColor"
            d="M84 259C57 181 86 82 185 62c120-25 241 36 257 140 14 89-57 181-152 214C198 448 112 342 84 259Z"
          />
        </svg>
        <motion.svg
          className="absolute right-[-8rem] top-20 h-[22rem] w-[48rem] text-[#17130d]/20"
          viewBox="0 0 720 160"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9 }}
          aria-hidden="true"
        >
          <motion.path
            d={inkPath}
            stroke="currentColor"
            strokeWidth="28"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1] }}
          />
          <motion.path
            d={inkPath}
            stroke="#17130d"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, delay: 0.12, ease: [0.65, 0, 0.35, 1] }}
          />
        </motion.svg>
      </div>

      <div className="relative mx-auto max-w-[1320px] px-[22px] py-7 sm:px-8 lg:px-[54px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 border border-[#17130d] bg-[#f7f0e2] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#17130d] shadow-[5px_5px_0_rgba(23,19,13,0.16)] transition-colors duration-200 hover:bg-[#17130d] hover:text-[#f7f0e2]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to The Octagon
        </Link>

        <section className="grid min-h-[72vh] gap-12 py-[73px] lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.78fr)] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-8 flex items-center gap-4">
              <span className="h-px w-16 bg-[#17130d]" />
              <span className="font-sans text-xs font-bold uppercase tracking-[0.42em] text-[#7d1d14]">
                Class of 2026
              </span>
            </div>
            <h1 className="max-w-[860px] font-serif text-[clamp(4.2rem,12vw,11rem)] font-black leading-[0.78] tracking-[-0.075em] text-[#17130d]">
              Senior <span className="block pl-[0.38em] italic">Superlatives</span>
            </h1>
            <p className="mt-8 max-w-[610px] border-l-[6px] border-[#17130d] pl-6 font-serif text-xl leading-8 text-[#332b20] sm:text-2xl">
              A ceremonial award scroll for the tiny, funny truths the senior class voted into legend.
            </p>
            <div className="mt-10 grid max-w-md grid-cols-2 border-y border-[#17130d] text-sm uppercase tracking-[0.22em]">
              <div className="border-r border-[#17130d] px-4 py-4">
                <p className="text-[0.68rem] font-bold text-[#6d6254]">Awards</p>
                <p className="mt-1 font-serif text-3xl font-black tracking-normal text-[#17130d]">10</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[0.68rem] font-bold text-[#6d6254]">Ballots</p>
                <p className="mt-1 font-serif text-3xl font-black tracking-normal text-[#17130d]">15</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="relative border-2 border-[#17130d] bg-[#f7f0e2] p-[18px] shadow-[14px_14px_0_rgba(23,19,13,0.15)]"
          >
            <div className="absolute -right-6 -top-6 grid h-24 w-24 place-items-center bg-[#7d1d14] text-center font-serif text-xl font-black leading-none text-[#f7f0e2] shadow-[6px_6px_0_rgba(23,19,13,0.18)]">
              Class
              <span className="block text-2xl">26</span>
            </div>
            <div className="border border-[#17130d]/35 p-7">
              <p className="text-xs font-black uppercase tracking-[0.38em] text-[#7d1d14]">Spotlight Award</p>
              <h2 className="mt-6 font-serif text-[clamp(2.6rem,6vw,5.8rem)] font-black leading-[0.88] tracking-[-0.06em]">
                Best
                <span className="block italic">Bromance</span>
              </h2>
              <div className="my-7 h-px bg-[#17130d]" />
              <p className="font-sans text-xs font-black uppercase tracking-[0.35em] text-[#6d6254]">Winners</p>
              <p className="mt-3 font-serif text-5xl font-black tracking-[-0.04em] text-[#17130d] sm:text-6xl">
                Dylan + Kamron
              </p>
              <p className="mt-7 max-w-sm text-sm leading-6 text-[#4d4438]">
                Stamped into the class record with the gravity of an old clan banner and the accuracy of a hallway joke.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="pb-24">
          <div className="mb-9 grid gap-4 border-t-4 border-[#17130d] pt-6 md:grid-cols-[0.72fr_1.28fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#7d1d14]">The Award Register</p>
              <h2 className="mt-3 font-serif text-5xl font-black tracking-[-0.055em]">Voted most likely</h2>
            </div>
            <div className="hidden h-px bg-[#17130d]/45 md:block" />
          </div>

          <div className="grid border-l border-t border-[#17130d] sm:grid-cols-2 lg:grid-cols-5">
            {superlatives.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }}
                className="group relative min-h-[278px] border-b border-r border-[#17130d] bg-[#f4ecd9] p-5 transition-colors duration-300 hover:bg-[#fbf4e7]"
              >
                <div className="absolute right-4 top-4 grid h-12 w-12 place-items-center border border-[#7d1d14] text-xs font-black text-[#7d1d14]">
                  {item.mark}
                </div>
                <div className="flex h-full flex-col justify-between">
                  <p className="max-w-[13rem] text-sm font-semibold leading-6 text-[#42382d]">{item.title}</p>
                  <div>
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.32em] text-[#7d1d14]">Winner</p>
                    <h3 className="mt-3 font-serif text-[2.75rem] font-black leading-[0.88] tracking-[-0.055em] text-[#17130d]">
                      {item.winner}
                    </h3>
                  </div>
                </div>
                <motion.div
                  className="absolute bottom-5 left-5 h-[3px] w-20 origin-left bg-[#17130d]"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.65, delay: 0.18 + index * 0.025 }}
                />
              </motion.article>
            ))}
          </div>

          <div className="mt-10 flex justify-end">
            <div className="max-w-sm border-l-4 border-[#7d1d14] pl-5 font-serif text-lg italic leading-7 text-[#4d4438]">
              Recorded in ink, voted in laughter, and filed under senior mythology.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
